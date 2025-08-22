<template>
  <div class="sml-node-editor__container">
    <div class="sml-node-editor">
      <div class="sml-node-editor__control" v-if="selectedNode"><h4>Add Transaction</h4>
        <div class="sml-node-editor__tx">
        <div class="tx__connect">From: <USelect v-model="fromNodeId" :items="getNodes" class="w-48" placeholder="Select node" />
            To: <USelect v-model="toNodeId" :items="getNodes" class="w-48" placeholder="Select node" /></div>
          <div class="tx__amount">Amount:<input type="number" v-model="txAmount" /></div>
        </div>
        <button v-on:click="orderTransaction()">Add Transaction</button>
      </div>
      <div class="sml-node-editor__control" v-if="selectedNode"><h4>Controls</h4>
        <button v-on:click="minePendingTransactions()">Mine New Block</button>
        <button v-on:click="validateChain()">Validate current chain</button>
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

const fromNodeId = ref<string|null>(null);
const toNodeId = ref<string|null>(null);
const fromNode = ref<SystemNode|null>(null);
const toNode = ref<SystemNode|null>(null);
const txAmount = ref<number>(0.0);

watch(fromNodeId, (newVal, oldVal) => {
  fromNode.value = props.nodes.find(node => node.systemNode.id === newVal)?.systemNode || null;
});

watch(toNodeId, (newVal, oldVal) => {
  toNode.value = props.nodes.find(node => node.systemNode.id === newVal)?.systemNode || null;
});

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
      fromNode.value.node.address,
      toNode.value.node.address,
      txAmount.value,
      fromNode.value.node.keyPair
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
    flex-wrap: wrap;
  }
  .sml-node-editor__tx .tx__connect, .sml-node-editor__tx .tx__amount {
    display: flex;
    flex-grow: 1;
    align-items: center;
    margin-bottom: 8px;
    justify-content: stretch;
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
  .sml-node-editor__control {
    padding: 5px;
    flex-grow: 1;
    border: 1px solid var(--frame-border);
    display: flex;
    flex-direction: column;
  }
  .sml-node-editor__control button {
    margin-bottom: 5px;
    cursor: pointer;
  }
</style>
