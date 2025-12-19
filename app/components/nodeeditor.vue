<!--
  NodeEditor Component
  
  Transaction builder and mining controls for the currently selected network node.
  Allows users to:
  - Create and broadcast transactions between nodes with specified amounts
  - Mine pending transactions into a new block
  - Validate the entire blockchain ledger
  
  Props:
  - nodes: Array of node objects containing systemNode, optional DOM element and graph reference
  - selectedNodeId: ID of the currently selected node (updates controls visibility)
  
  Event Flow: User creates tx → orderTransaction() → broadcasts to peer nodes → animations
  Mining Flow: User clicks Mine → minePendingTransactions() → startMining() → PoW computation
-->
<template>
  <div class="sml-node-editor">
    <div class="sml-node-editor__control" v-if="selectedNode"><h4 class="font-bold text-lg">Add Transaction</h4>
      <div class="sml-node-editor__tx">
        <div class="tx__connect">
          <UBadge color="neutral" trailing-icon="i-lucide-arrow-right-from-line" size="lg">From</UBadge>
          <USelect v-model="fromNode" :items="getNodes" class="w-48" placeholder="Select node" />
          <UBadge color="neutral" trailing-icon="i-lucide-arrow-right-to-line" size="lg">To</UBadge>
          <USelect v-model="toNode" :items="getNodes" class="w-48" placeholder="Select node" />
        </div>
      <div class="tx__amount"><UBadge color="neutral" trailing-icon="i-lucide-banknote" size="lg">Amount</UBadge><UInputNumber v-model="txAmount" :step="10" /></div>
              <UButton v-on:click="orderTransaction()">Add Transaction</UButton>
      </div>
    </div>
    <div class="sml-node-editor__control" v-if="selectedNode"><h4 class="font-bold text-lg">Controls</h4>
      <div class="sml-node-editor__tx">
      <UButton v-on:click="minePendingTransactions()">Mine New Block</UButton>
      <UButton v-on:click="validateChain()">Validate current chain</UButton>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { SystemNode } from '~~/src/network/system_node';

const props = defineProps<{
  nodes: {
    systemNode: SystemNode,
    element?: HTMLDivElement,
    graphRef?: any,
  }[],
  selectedNodeId: string
}>();


const fromNode = ref<SystemNode|null>(null);
const toNode = ref<SystemNode|null>(null);
const txAmount = ref<number>(0.0);

const getNodes = computed(() => {
  return props.nodes.map((node) => ({ label: node.systemNode.id, value: node.systemNode }));
});


const selectedNode = ref<any>(null);

watch(() => props.selectedNodeId, (value) => {
  selectedNode.value = getCurrentNode();
});

function getCurrentNode() {
  return props.nodes.find(node => node.systemNode.id === props.selectedNodeId);
}

/**
 * Creates and broadcasts a transaction between two nodes
 * 
 * Validates both sender and receiver are selected with amount > 0.
 * Calls orderTransaction() on the sender node to create signed transaction.
 * Transaction propagates to all connected peers via the event system.
 * 
 * @returns {void}
 */
function orderTransaction() {
  if (fromNode.value && toNode.value && txAmount.value > 0) {
    selectedNode.value.systemNode.orderTransaction(
      fromNode.value.address,
      toNode.value.address,
      txAmount.value,
      fromNode.value.keyPair
    );
  }
}

/**
 * Initiates proof-of-work mining on the selected node
 * 
 * Starts mining process for all pending transactions.
 * Mining runs in a Web Worker to prevent UI blocking.
 * Completes when nonce found that satisfies difficulty target.
 * New block added to blockchain and broadcast to all peers.
 * 
 * @returns {void}
 */
function minePendingTransactions() {
  selectedNode.value.systemNode.startMining();
}

/**
 * Validates the integrity of the selected node's blockchain
 * 
 * Verifies all blocks and transactions in the chain:
 * - Each block's hash matches its content (tamper-detection)
 * - previousHash links form unbroken chain
 * - All transaction signatures are valid
 * - Block rewards properly assigned
 * 
 * Logs validation result to browser console.
 * 
 * @returns {void}
 */
function validateChain() {
  console.log(selectedNode.value.systemNode.blockchain);
  selectedNode.value.systemNode.blockchain.isChainValid();
}
</script>

<style>
  .sml-node-editor {
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    text-align: left;
    padding: 5px;
  }
  .sml-node-editor h4, .sml-node-editor h5 {
    margin: 0;
  }
  .sml-node-editor__tx {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .sml-node-editor__tx .tx__connect, .sml-node-editor__tx .tx__amount {
    display: flex;
    gap: 8px;
  }
  .sml-node-editor__tx .tx__amount {
    width: 30%;
  }
  .sml-node-editor__tx .tx__amount input[type="number"] {
    width: 100%;
    margin-left: 8px;
  }
  .sml-node-editor__tx .tx__connect .v-select {
    flex-grow: 1;
    min-width: 160px;
    margin: 0 8px;
  }
</style>
