<!--
  NodeEditor Component

  Transaction builder and mining controls for the currently selected network node.
  Allows users to:
  - Create and broadcast transactions between nodes with specified amounts
  - Mine pending transactions into a new block
  - Validate the entire blockchain ledger

  Event Flow: User creates tx → sendTransaction() → broadcasts to peer nodes → animations
  Mining Flow: User clicks Mine → startMining() → PoW computation → block broadcast
-->
<template>
  <div class="sml-node-editor">
    <p v-if="!selectedId" class="sml-node-editor__empty">Select a node to issue transactions or mine blocks.</p>
    <template v-else>
      <section class="sml-node-editor__control">
        <h4 class="font-bold text-lg">Add Transaction <span class="sml-node-editor__via">via {{ selectedId }}</span></h4>
        <form class="sml-node-editor__tx" data-testid="editor-tx-form" @submit.prevent="orderTransaction">
          <div class="tx__connect">
            <UFormField label="From">
              <USelect v-model="fromId" :items="nodeItems" class="w-40" placeholder="Select node" icon="i-lucide-arrow-right-from-line" data-testid="editor-from" />
            </UFormField>
            <UFormField label="To">
              <USelect v-model="toId" :items="nodeItems" class="w-40" placeholder="Select node" icon="i-lucide-arrow-right-to-line" data-testid="editor-to" />
            </UFormField>
          </div>
          <UFormField label="Amount">
            <UInputNumber v-model="txAmount" :step="10" :min="0" data-testid="editor-amount" />
          </UFormField>
          <UButton type="submit" class="max-h-fit" icon="i-lucide-circle-plus" :disabled="!canSubmit" data-testid="editor-add">Add</UButton>
        </form>
      </section>
      <section class="sml-node-editor__control">
        <h4 class="font-bold text-lg">Controls</h4>
        <div class="sml-node-editor__tx">
          <UButton icon="i-lucide-pickaxe" :loading="isMining" :disabled="isMining" data-testid="editor-mine" @click="minePendingTransactions">
            {{ isMining ? 'Mining…' : 'Mine New Block' }}
          </UButton>
          <UButton icon="i-lucide-ticket-check" variant="outline" data-testid="editor-validate" @click="validateChain">Validate current chain</UButton>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNetwork } from '~/composables/useNetwork';

const network = useNetwork();
const toast = useToast();

const fromId = ref<string | undefined>();
const toId = ref<string | undefined>();
const txAmount = ref<number>(0);

const selectedId = computed(() => network.selectedNodeId.value);
const nodeItems = computed(() => network.nodeIds.value.map(id => ({ label: id, value: id })));
const isMining = computed(() => !!(selectedId.value && network.getNodeView(selectedId.value)?.isMining));
const canSubmit = computed(() => !!fromId.value && !!toId.value && txAmount.value > 0);

/**
 * Creates and broadcasts a transaction between two nodes
 *
 * The selected node adds the signed transaction to its pending pool and
 * broadcasts it to its peers.
 */
function orderTransaction() {
  if (!selectedId.value || !fromId.value || !toId.value) {
    return;
  }
  if (network.sendTransaction(selectedId.value, fromId.value, toId.value, txAmount.value)) {
    toast.add({ title: 'Transaction submitted', description: `${txAmount.value} from ${fromId.value} to ${toId.value}`, icon: 'i-lucide-send', color: 'info' });
  } else {
    toast.add({ title: 'Transaction rejected', description: `${selectedId.value} did not accept the transaction. See the console for details.`, icon: 'i-lucide-ban', color: 'error' });
  }
}

/**
 * Initiates proof-of-work mining on the selected node
 * Mining runs in a Web Worker; the new block is broadcast to all peers.
 */
function minePendingTransactions() {
  if (selectedId.value) {
    network.startMining(selectedId.value);
  }
}

/**
 * Validates the integrity of the selected node's blockchain
 * (hashes, chain links, signatures and balances) and reports the result.
 */
function validateChain() {
  if (!selectedId.value) {
    return;
  }
  const valid = network.validateChain(selectedId.value);
  toast.add(valid
    ? { title: 'Chain is valid', description: `${selectedId.value}'s blockchain passed validation.`, icon: 'i-lucide-shield-check', color: 'success' }
    : { title: 'Chain is invalid', description: `${selectedId.value}'s blockchain failed validation. See the console for details.`, icon: 'i-lucide-shield-alert', color: 'error' });
}

defineExpose({ fromId, toId, txAmount, orderTransaction, minePendingTransactions, validateChain });
</script>

<style>
  .sml-node-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
    padding: 5px;
    overflow-y: auto;
  }
  .sml-node-editor h4 {
    margin: 0;
  }
  .sml-node-editor__via {
    font-size: 0.75rem;
    font-weight: normal;
    color: var(--ui-text-muted);
  }
  .sml-node-editor__empty {
    color: var(--ui-text-muted);
    font-size: 0.875rem;
  }
  .sml-node-editor__tx {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: end;
    padding: 6px;
    background: var(--ui-bg-elevated);
    border-radius: 4px;
  }
  .sml-node-editor__tx .tx__connect {
    display: flex;
    gap: 8px;
  }
</style>
