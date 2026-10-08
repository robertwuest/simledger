<!--
  NodeExplorer Component

  Inspects the blockchain of the selected node:
  - Summary: wallet address, balance, chain height and pending transactions
  - Blocks: the chain (newest first), expandable to block details and transactions
  - Pending: transactions waiting to be mined
  - Ledger: all confirmed transactions

  The selection is shared with the graph through the network store.
-->
<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <PaneHeader title="Explorer">
      <template #actions>
        <USelect
          :model-value="network.selectedNodeId.value ?? undefined"
          :items="nodeItems"
          size="xs"
          class="w-36"
          placeholder="Select node"
          aria-label="Explore node"
          data-testid="explorer-select"
          @update:model-value="onSelect"
        >
          <template #leading="{ modelValue }">
            <NodeDot v-if="modelValue" :node-id="String(modelValue)" />
            <UIcon v-else name="i-lucide-workflow" class="size-4 text-dimmed" />
          </template>
          <template #item-leading="{ item }">
            <NodeDot :node-id="item.value" />
          </template>
        </USelect>
      </template>
    </PaneHeader>

    <UEmpty
      v-if="!node || !view"
      icon="i-lucide-mouse-pointer-click"
      title="No node selected"
      description="Select a node in the graph or pick one above to inspect its blockchain."
      variant="naked"
      size="sm"
      class="flex-1"
    />

    <div v-else class="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <section class="space-y-3 border-b border-default p-3" data-testid="explorer-summary">
        <div class="flex items-center gap-2">
          <NodeDot :node-id="view.id" />
          <span class="font-semibold text-highlighted">{{ view.id }}</span>
          <span class="ml-auto flex min-w-0 items-center gap-1">
            <code class="truncate font-mono text-xs text-muted" :title="view.address" data-testid="explorer-address">{{ shortAddress }}</code>
            <UButton
              icon="i-lucide-copy"
              size="xs"
              color="neutral"
              variant="ghost"
              aria-label="Copy wallet address"
              data-testid="explorer-copy-address"
              @click="copyAddress"
            />
          </span>
        </div>
        <dl class="grid grid-cols-3 gap-2">
          <div v-for="stat in stats" :key="stat.label" class="rounded-md bg-elevated/50 px-2 py-1.5 ring ring-default">
            <dt class="text-xs text-muted">{{ stat.label }}</dt>
            <dd class="font-semibold tabular-nums text-highlighted" :data-testid="`explorer-stat-${stat.key}`">{{ stat.value }}</dd>
          </div>
        </dl>
      </section>

      <UAccordion
        type="multiple"
        :items="sections"
        :default-value="['blocks', 'pending']"
        :unmount-on-hide="false"
        :ui="{ item: 'px-3', trigger: 'py-2 text-sm', body: 'pb-3' }"
      >
        <template #trailing="{ item, open }">
          <span class="ms-auto flex items-center gap-2">
            <UBadge color="neutral" variant="soft" size="sm" class="tabular-nums">{{ item.count }}</UBadge>
            <UIcon name="i-lucide-chevron-down" class="size-4 text-dimmed transition-transform" :class="{ 'rotate-180': open }" />
          </span>
        </template>

        <template #blocks-body>
          <ol class="space-y-1.5" data-testid="explorer-chain">
            <li v-for="block in blocksNewestFirst" :key="block.hash">
              <UButton
                color="neutral"
                :variant="expandedBlock === block.index ? 'soft' : 'ghost'"
                block
                class="justify-start gap-2"
                :aria-expanded="expandedBlock === block.index"
                data-testid="explorer-block"
                @click="toggleBlock(block.index)"
              >
                <span class="font-mono font-semibold">#{{ block.index }}</span>
                <UBadge v-if="block.index === 0" color="secondary" variant="subtle" size="sm">Genesis</UBadge>
                <span class="whitespace-nowrap text-xs text-muted">{{ block.transactions.length }} tx</span>
                <code class="ms-auto truncate font-mono text-xs text-dimmed">{{ block.hash.slice(0, 10) }}</code>
                <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-dimmed transition-transform" :class="{ 'rotate-90': expandedBlock === block.index }" />
              </UButton>
              <div v-if="expandedBlock === block.index" class="mt-1 ms-3 space-y-2 border-s border-default ps-3" data-testid="explorer-block-details">
                <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                  <dt class="text-muted">Hash</dt>
                  <dd class="truncate font-mono" :title="block.hash">{{ block.hash }}</dd>
                  <dt class="text-muted">Previous</dt>
                  <dd class="truncate font-mono" :title="block.previousHash">{{ block.previousHash }}</dd>
                  <dt class="text-muted">Nonce</dt>
                  <dd class="font-mono">{{ block.nonce }}</dd>
                  <dt class="text-muted">Mined</dt>
                  <dd>{{ formatTimestamp(block.timestamp) }}</dd>
                  <dt class="text-muted">Miner</dt>
                  <dd class="min-w-0"><AddressLabel :address="block.rewardAddress" /></dd>
                </dl>
                <ul class="divide-y divide-default">
                  <TransactionItem v-for="(tx, txIndex) in block.transactions" :key="`${txIndex}-${tx.nonce}`" :transaction="tx" />
                </ul>
              </div>
            </li>
          </ol>
        </template>

        <template #pending-body>
          <ul v-if="pending.length" class="divide-y divide-default" data-testid="explorer-pending">
            <TransactionItem v-for="(tx, txIndex) in pending" :key="`${txIndex}-${tx.nonce}`" :transaction="tx" />
          </ul>
          <p v-else class="text-sm text-muted" data-testid="explorer-pending">No pending transactions.</p>
        </template>

        <template #ledger-body>
          <ul class="divide-y divide-default" data-testid="explorer-ledger">
            <template v-for="block in blocksNewestFirst" :key="block.hash">
              <TransactionItem
                v-for="(tx, txIndex) in block.transactions"
                :key="`${block.hash}-${txIndex}-${tx.nonce}`"
                :transaction="tx"
                :block="block.index"
              />
            </template>
          </ul>
        </template>
      </UAccordion>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import PaneHeader from './PaneHeader.vue';
import NodeDot from './ledger/NodeDot.vue';
import AddressLabel from './ledger/AddressLabel.vue';
import TransactionItem from './ledger/TransactionItem.vue';
import { useNetwork } from '~/composables/useNetwork';

const network = useNetwork();
const toast = useToast();
const expandedBlock = ref<number | null>(null);

const nodeItems = computed(() => network.nodeIds.value.map(id => ({ label: id, value: id })));

const node = computed(() => {
  void network.version.value;
  return network.getNode(network.selectedNodeId.value);
});

const view = computed(() => (node.value ? network.getNodeView(node.value.id) : undefined));

const chain = computed(() => {
  void network.version.value;
  return node.value ? [...node.value.blockchain.chain] : [];
});

const pending = computed(() => {
  void network.version.value;
  return node.value ? [...node.value.blockchain.pendingTransactions] : [];
});

/** Blocks with their position in the chain, newest first */
const blocksNewestFirst = computed(() => chain.value
  .map((block, index) => ({ ...block, index, transactions: block.transactions }))
  .reverse());

const ledgerCount = computed(() => chain.value.reduce((sum, block) => sum + block.transactions.length, 0));

const sections = computed(() => [
  { label: 'Blocks', value: 'blocks', slot: 'blocks' as const, icon: 'i-lucide-boxes', count: chain.value.length },
  { label: 'Pending', value: 'pending', slot: 'pending' as const, icon: 'i-lucide-hourglass', count: pending.value.length },
  { label: 'Ledger', value: 'ledger', slot: 'ledger' as const, icon: 'i-lucide-book-open', count: ledgerCount.value },
]);

const stats = computed(() => [
  { key: 'balance', label: 'Balance', value: view.value?.balance ?? 0 },
  { key: 'blocks', label: 'Blocks', value: chain.value.length },
  { key: 'pending', label: 'Pending', value: pending.value.length },
]);

const shortAddress = computed(() => {
  const address = view.value?.address ?? '';
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-6)}` : address;
});

watch(network.selectedNodeId, () => {
  expandedBlock.value = null;
});

function onSelect(value: unknown) {
  network.select(typeof value === 'string' ? value : null);
}

function toggleBlock(index: number) {
  expandedBlock.value = expandedBlock.value === index ? null : index;
}

/**
 * Format a block timestamp (ms since epoch as string); the genesis block has none
 * @param timestamp - Block timestamp
 */
function formatTimestamp(timestamp: string) {
  const ms = Number(timestamp);
  return ms > 0 ? new Date(ms).toLocaleTimeString([], { hour12: false }) : '—';
}

async function copyAddress() {
  if (!view.value) return;
  try {
    await navigator.clipboard.writeText(view.value.address);
    toast.add({ title: 'Address copied', description: `${view.value.id}'s wallet address is on the clipboard.`, icon: 'i-lucide-clipboard-check', color: 'neutral' });
  } catch {
    toast.add({ title: 'Copy failed', description: 'The clipboard is not available.', icon: 'i-lucide-clipboard-x', color: 'error' });
  }
}

defineExpose({ expandedBlock, toggleBlock, formatTimestamp });
</script>
