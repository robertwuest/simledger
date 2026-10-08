<!--
  NodeEditor Component

  Actions issued through the selected network node:
  - New transaction: sign a transfer between two wallets and broadcast it via the selected node
  - Mining & validation: mine the pending transactions into a block and validate the chain

  Event Flow: User sends tx → sendTransaction() → broadcasts to peer nodes → animations
  Mining Flow: User clicks Mine → startMining() → PoW computation → block broadcast
-->
<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <PaneHeader title="Editor">
      <template #actions>
        <UBadge v-if="selectedId" color="neutral" variant="subtle" size="sm" class="gap-1.5" data-testid="editor-issuer">
          <NodeDot :node-id="selectedId" />via {{ selectedId }}
        </UBadge>
      </template>
    </PaneHeader>

    <UEmpty
      v-if="!selectedId"
      icon="i-lucide-square-pen"
      title="No node selected"
      description="Select a node to issue transactions or mine blocks."
      variant="naked"
      size="sm"
      class="flex-1"
    />

    <div v-else class="@container min-h-0 flex-1 overflow-y-auto p-3">
      <div class="grid gap-3 @xl:grid-cols-2">
        <UCard variant="subtle" :ui="{ header: 'p-3 sm:px-3', body: 'p-3 sm:p-3' }">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-send" class="size-4 text-primary" />
              <h3 class="text-sm font-semibold text-highlighted">New transaction</h3>
            </div>
            <p class="mt-0.5 text-xs text-muted">Signed with the sender's key and broadcast via {{ selectedId }}.</p>
          </template>

          <UForm
            ref="form"
            :state="state"
            :validate="validate"
            :validate-on="['change']"
            class="space-y-3"
            data-testid="editor-tx-form"
            @submit="orderTransaction"
          >
            <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2">
              <UFormField label="From" name="from">
                <USelect v-model="state.from" :items="nodeItems" placeholder="Select" class="w-full" data-testid="editor-from">
                  <template #leading="{ modelValue }">
                    <NodeDot v-if="modelValue" :node-id="String(modelValue)" />
                  </template>
                  <template #item-leading="{ item }">
                    <NodeDot :node-id="item.value" />
                  </template>
                </USelect>
              </UFormField>
              <UButton
                icon="i-lucide-arrow-left-right"
                color="neutral"
                variant="ghost"
                class="mt-6"
                aria-label="Swap sender and recipient"
                data-testid="editor-swap"
                @click="swap"
              />
              <UFormField label="To" name="to">
                <USelect v-model="state.to" :items="nodeItems" placeholder="Select" class="w-full" data-testid="editor-to">
                  <template #leading="{ modelValue }">
                    <NodeDot v-if="modelValue" :node-id="String(modelValue)" />
                  </template>
                  <template #item-leading="{ item }">
                    <NodeDot :node-id="item.value" />
                  </template>
                </USelect>
              </UFormField>
            </div>

            <UFormField label="Amount" name="amount">
              <UInputNumber v-model="state.amount" :step="10" :min="0" class="w-full" data-testid="editor-amount" />
              <template #help>
                <span v-if="exceedsBalance" class="flex items-center gap-1 text-warning" data-testid="editor-balance-warning">
                  <UIcon name="i-lucide-triangle-alert" class="size-3.5" />
                  Exceeds {{ state.from }}'s balance of {{ senderBalance }}, the node will reject it.
                </span>
                <span v-else-if="state.from" data-testid="editor-balance">Available: {{ senderBalance }}</span>
              </template>
            </UFormField>

            <UButton type="submit" icon="i-lucide-send" block data-testid="editor-add">Send transaction</UButton>
          </UForm>
        </UCard>

        <UCard variant="subtle" :ui="{ header: 'p-3 sm:px-3', body: 'p-3 sm:p-3 space-y-3' }">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-pickaxe" class="size-4 text-primary" />
              <h3 class="text-sm font-semibold text-highlighted">Mining &amp; validation</h3>
            </div>
            <p class="mt-0.5 text-xs text-muted" data-testid="editor-pending-count">
              {{ pendingTransfers }} pending {{ pendingTransfers === 1 ? 'transaction' : 'transactions' }} waiting for a block.
            </p>
          </template>

          <div class="space-y-1.5">
            <UButton
              icon="i-lucide-pickaxe"
              block
              :loading="isMining"
              :disabled="!canMine"
              data-testid="editor-mine"
              @click="minePendingTransactions"
            >
              {{ isMining ? 'Mining…' : 'Mine block' }}
            </UButton>
            <template v-if="isMining">
              <UProgress :model-value="null" size="xs" data-testid="editor-mining-progress" />
              <p class="text-xs text-muted">Proof of work running, lottery roll {{ miningRoll }}.</p>
            </template>
            <p v-else-if="!pendingTransfers" class="text-xs text-muted" data-testid="editor-mine-hint">Add a transaction first, blocks need at least one transfer.</p>
          </div>

          <USeparator />

          <div class="space-y-2">
            <UButton icon="i-lucide-shield-check" color="neutral" variant="outline" block data-testid="editor-validate" @click="validateChain">
              Validate chain
            </UButton>
            <UAlert
              v-if="validation"
              :color="validation.valid ? 'success' : 'error'"
              variant="subtle"
              :icon="validation.valid ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'"
              :title="validation.valid ? 'Chain valid' : 'Chain invalid'"
              :description="validation.valid
                ? `${validation.nodeId}'s blockchain passed validation at ${validation.time}.`
                : `${validation.nodeId}'s blockchain failed validation at ${validation.time}. See the console for details.`"
              :ui="{ root: 'p-2.5', title: 'text-sm', description: 'text-xs' }"
              data-testid="editor-validation"
            />
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { FormError } from '@nuxt/ui';
import PaneHeader from './PaneHeader.vue';
import NodeDot from './ledger/NodeDot.vue';
import { useNetwork } from '~/composables/useNetwork';
import { MINING_REWARD_ADDRESS } from '~/utils/address';

interface TransactionForm {
  from?: string;
  to?: string;
  amount: number;
}

const network = useNetwork();
const toast = useToast();

const state = reactive<TransactionForm>({ from: undefined, to: undefined, amount: 0 });
const validation = ref<{ nodeId: string; valid: boolean; time: string } | null>(null);

const selectedId = computed(() => network.selectedNodeId.value);
const nodeItems = computed(() => network.nodeIds.value.map(id => ({
  label: id,
  value: id,
  description: `Balance ${network.getNodeView(id)?.balance ?? 0}`,
})));

const view = computed(() => (selectedId.value ? network.getNodeView(selectedId.value) : undefined));
const isMining = computed(() => !!view.value?.isMining);
const miningRoll = computed(() => (view.value?.miningDelay ?? 0) + 1);

const pendingTransfers = computed(() => {
  void network.version.value;
  const node = network.getNode(selectedId.value);
  return node ? node.blockchain.pendingTransactions.filter(tx => tx.fromAddress !== MINING_REWARD_ADDRESS).length : 0;
});
const canMine = computed(() => !isMining.value && pendingTransfers.value > 0);

const senderBalance = computed(() => (state.from ? network.getNodeView(state.from)?.balance ?? 0 : 0));
const exceedsBalance = computed(() => !!state.from && state.amount > senderBalance.value);

// Default the sender to the issuing node; reset per-node feedback
watch(selectedId, (id) => {
  validation.value = null;
  if (id && !state.from) {
    state.from = id;
  }
}, { immediate: true });

/**
 * Blocking form validation (balance is only a warning, rejections are part of the simulation)
 */
function validate(values: Partial<TransactionForm>): FormError[] {
  const errors: FormError[] = [];
  if (!values.from) errors.push({ name: 'from', message: 'Choose a sender' });
  if (!values.to) errors.push({ name: 'to', message: 'Choose a recipient' });
  if (values.from && values.to && values.from === values.to) errors.push({ name: 'to', message: 'Must differ from the sender' });
  if (!values.amount || values.amount <= 0) errors.push({ name: 'amount', message: 'Enter an amount above 0' });
  return errors;
}

function swap() {
  [state.from, state.to] = [state.to, state.from];
}

/**
 * Signs and broadcasts the transaction through the selected node
 */
function orderTransaction() {
  if (!selectedId.value || !state.from || !state.to) {
    return;
  }
  const { from, to, amount } = state;
  if (network.sendTransaction(selectedId.value, from, to, amount)) {
    toast.add({ title: 'Transaction submitted', description: `${amount} from ${from} to ${to}`, icon: 'i-lucide-send', color: 'info' });
    state.amount = 0;
  } else {
    toast.add({ title: 'Transaction rejected', description: `${selectedId.value} did not accept the transaction. See the console for details.`, icon: 'i-lucide-ban', color: 'error' });
  }
}

/**
 * Initiates proof-of-work mining on the selected node
 * Mining runs in a Web Worker; the new block is broadcast to all peers.
 */
function minePendingTransactions() {
  if (selectedId.value && canMine.value) {
    network.startMining(selectedId.value);
  }
}

/**
 * Validates the integrity of the selected node's blockchain
 * (hashes, chain links, signatures and balances) and shows the result inline.
 */
function validateChain() {
  if (!selectedId.value) {
    return;
  }
  validation.value = {
    nodeId: selectedId.value,
    valid: network.validateChain(selectedId.value),
    time: new Date().toLocaleTimeString([], { hour12: false }),
  };
}

defineExpose({ state, validate, swap, orderTransaction, minePendingTransactions, validateChain });
</script>
