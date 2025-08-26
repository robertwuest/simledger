<template>
  <div class="sml-node-explorer">
    <USelect v-model="selectedNodeId" :items="getNodes" class="w-48" placeholder="Select node" />
    <div v-if="selectedNode" class="sml-node-explorer__ledger">
      <h4>Ledger</h4>
      <ul v-for="block in selectedNode.blockchain.chain" :key="block.hash">
        <li v-for="tx in block.transactions" :key="tx.hash">
          [{{ tx.amount }}] <span v-html="findAddressId(tx.fromAddress)"></span> &rarr; <span v-html="findAddressId(tx.toAddress)"></span>
        </li>
      </ul>
    </div>
    <div v-if="selectedNode" class="sml-node-explorer__pending">
      <h4>Pending Transactions</h4>
      <ul>
        <li v-for="tx in selectedNode.blockchain.pendingTransactions" :key="tx.hash">
          [{{ tx.amount }}] <span v-html="findAddressId(tx.fromAddress)"></span> &rarr; <span v-html="findAddressId(tx.toAddress)"></span>
        </li>
      </ul>
    </div>
    <div v-if="selectedNode" class="sml-node-explorer__chain">
      <h4>Chain</h4>
      <span v-for="block in selectedNode.blockchain.chain" :key="block.length"><span class="sml-node-explorer__chain-block" v-bind:class="{ 'sml-node-explorer__chain-block--selected': selectedBlockIndex === block.length - 1 }" v-on:click="selectedBlockIndex = block.length - 1">Block_{{block.length - 1 > 0 ? block.length - 1: '&#127878;'}}</span> &rarr; </span>
      <div v-if="selectedNode && selectedBlockIndex >= 0">
        <h5>Explore: Block_{{selectedBlockIndex}}</h5>
        <ul>
          <li v-for="tx in selectedNode.blockchain.chain[selectedBlockIndex].transactions" :key="tx.hash">
            [{{ tx.amount }}] <span v-html="findAddressId(tx.fromAddress)"></span> &rarr; <span v-html="findAddressId(tx.toAddress)"></span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, defineExpose, watch } from 'vue';
import type { SystemNode } from '~~/src/network/system_node';

const props = defineProps<{
  nodes: {
    systemNode: SystemNode,
    element?: HTMLDivElement,
    graphRef?: any,
  }[]
}>();
const emit = defineEmits(["node-changed"]);

const selectedNode = ref<SystemNode|null>(null);
const selectedNodeId = ref<string|null>(null);
const selectedBlockIndex = ref<number>(-1);

watch(selectedNodeId, (newVal, oldVal) => {
  updateSelectedNode(newVal);
});

const getNodes = computed(() => {
  return props.nodes.map((node) => ({ label: node.systemNode.id, value: node.systemNode }));
});

function updateSelectedNode(node: any) {
  selectedNode.value = node;
  selectedBlockIndex.value = -1;
  if (selectedNode.value) {
    emit('node-changed', selectedNode.value.id);
  }
}

function findAddressId(address: string) {
  if (address === '_') {
    return '&#9889;'; // Mining transaction source
  }
  if (props.nodes.length > 0 && address === props.nodes[0].systemNode.blockchain.genesisAddress) {
    return '&#127878; Genesis'; // Genesis transaction source
  }
  const node = props.nodes.find(item => item.systemNode.address === address);
  if (node) {
    return node.systemNode.id;
  }
  return `${address.substring(0, 6)}...`;
}

defineExpose({
  updateSelectedNode,
  findAddressId,
  getNodes,
  selectedNode,
  selectedBlockIndex
});
</script>

<style>
  .sml-node-explorer {
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    text-align: left;
    padding: 5px;
  }
  .sml-node-explorer .vs__dropdown-toggle {
    border: 1px solid var(--frame-border);
  }
  .sml-node-explorer h4, .sml-node-explorer h5 {
    margin: 0;
  }
  .sml-node-explorer__header {
    font-weight: bold;
  }
  .sml-node-explorer .v-select, .sml-node-explorer__ledger, .sml-node-explorer__pending {
    margin-bottom: 4px;
  }
  .sml-node-explorer__ledger, .sml-node-explorer__pending, .sml-node-explorer__chain {
    flex-grow: 1;
    border: 1px solid var(--frame-border);
    display: flex;
    flex-direction: column;
  }
  .sml-node-explorer__ledger ul, .sml-node-explorer__pending ul, .sml-node-explorer__chain ul {
    font-family: monospace;
    font-size: 10pt;
  }
  .sml-node-explorer__ledger ul, .sml-node-explorer__pending ul, .sml-node-explorer__chain ul {
    line-height: 1.5;
    margin: 0;
    display: flex;
    flex-direction: column;
  }
  .sml-node-explorer__ledger ul li, .sml-node-explorer__pending ul li, .sml-node-explorer__chain ul li {
    background: rgba(0, 255, 255, 0.25);
    border-radius: 3px;
    margin: 1px;
    vertical-align: baseline;
  }
  .sml-node-explorer__chain {
    display: block;
  }
  .sml-node-explorer__chain-block {
    font-family: monospace;
    font-size: 10pt;
    display: inline-block;
    background: rgba(255, 0, 255, 0.25);
    border-radius: 3px;
    margin: 1px;
    cursor: pointer;
    line-height: 1;
    padding: 4px 2px;
  }
  .sml-node-explorer__chain-block--selected {
    border: 1px solid var(--frame-border);
  }

</style>
