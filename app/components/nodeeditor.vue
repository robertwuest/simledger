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

function minePendingTransactions() {
  selectedNode.value.systemNode.startMining();
}

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
