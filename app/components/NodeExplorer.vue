<!--
  NodeExplorer Component

  Displays blockchain state for the selected node including:
  - Transaction ledger (all transactions by block)
  - Pending transactions (not yet mined)
  - Full blockchain visualization with clickable blocks
  - Transaction details (sender, recipient, amount)

  The selection is shared with the graph through the network store.
-->
<template>
  <div class="sml-node-explorer">
    <USelect
      :model-value="network.selectedNodeId.value ?? undefined"
      :items="nodeItems"
      class="w-48"
      placeholder="Select node"
      icon="i-lucide-workflow"
      aria-label="Explore node"
      data-testid="explorer-select"
      @update:model-value="onSelect"
    />
    <p v-if="!selectedNode" class="sml-node-explorer__empty">Select a node in the graph to inspect its blockchain.</p>
    <template v-else>
      <section class="sml-node-explorer__ledger" data-testid="explorer-ledger">
        <h4>Ledger</h4>
        <ul v-for="block in chain" :key="block.hash">
          <li v-for="(tx, txIndex) in block.transactions" :key="`${txIndex}-${tx.nonce}`">
            [{{ tx.amount }}] {{ label(tx.fromAddress) }} &rarr; {{ label(tx.toAddress) }}
          </li>
        </ul>
      </section>
      <section class="sml-node-explorer__pending" data-testid="explorer-pending">
        <h4>Pending Transactions</h4>
        <ul>
          <li v-for="(tx, txIndex) in pending" :key="`${txIndex}-${tx.nonce}`">
            [{{ tx.amount }}] {{ label(tx.fromAddress) }} &rarr; {{ label(tx.toAddress) }}
          </li>
        </ul>
      </section>
      <section class="sml-node-explorer__chain" data-testid="explorer-chain">
        <h4>Chain</h4>
        <span v-for="(block, index) in chain" :key="block.hash">
          <button
            type="button"
            class="sml-node-explorer__chain-block"
            :class="{ 'sml-node-explorer__chain-block--selected': selectedBlockIndex === index }"
            :aria-pressed="selectedBlockIndex === index"
            data-testid="explorer-block"
            @click="selectedBlockIndex = index"
          >Block_{{ index > 0 ? index : '🎆' }}</button> &rarr;
        </span>
        <div v-if="selectedBlock">
          <h5>Explore: Block_{{ selectedBlockIndex }}</h5>
          <ul>
            <li v-for="(tx, txIndex) in selectedBlock.transactions" :key="`${txIndex}-${tx.nonce}`">
              [{{ tx.amount }}] {{ label(tx.fromAddress) }} &rarr; {{ label(tx.toAddress) }}
            </li>
          </ul>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useNetwork } from '~/composables/useNetwork';
import { describeAddress } from '~/utils/address';

const network = useNetwork();
const selectedBlockIndex = ref(-1);

const nodeItems = computed(() => network.nodeIds.value.map(id => ({ label: id, value: id })));

const selectedNode = computed(() => {
  void network.version.value;
  return network.getNode(network.selectedNodeId.value);
});

const chain = computed(() => {
  void network.version.value;
  return selectedNode.value ? [...selectedNode.value.blockchain.chain] : [];
});

const pending = computed(() => {
  void network.version.value;
  return selectedNode.value ? [...selectedNode.value.blockchain.pendingTransactions] : [];
});

const selectedBlock = computed(() => chain.value[selectedBlockIndex.value]);

watch(network.selectedNodeId, () => {
  selectedBlockIndex.value = -1;
});

function onSelect(value: unknown) {
  network.select(typeof value === 'string' ? value : null);
}

/**
 * Human readable name of an address (node name, genesis, reward or shortened address)
 * @param address - Address to describe
 */
function label(address: string) {
  const nodes = network.nodes.value;
  return describeAddress(address, nodes, nodes[0]?.blockchain.genesisAddress).label;
}

defineExpose({ selectedBlockIndex, label });
</script>

<style>
  .sml-node-explorer {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    padding: 5px;
    overflow-y: auto;
    flex-grow: 1;
  }
  .sml-node-explorer h4, .sml-node-explorer h5 {
    margin: 0;
    font-weight: bold;
  }
  .sml-node-explorer__empty {
    color: var(--ui-text-muted);
    font-size: 0.875rem;
  }
  .sml-node-explorer__ledger, .sml-node-explorer__pending, .sml-node-explorer__chain {
    flex-grow: 1;
    padding: 2px 4px;
    border: 1px solid var(--ui-border);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
  }
  .sml-node-explorer__ledger ul, .sml-node-explorer__pending ul, .sml-node-explorer__chain ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    font-family: monospace;
    font-size: 10pt;
    line-height: 1.5;
  }
  .sml-node-explorer__ledger ul li, .sml-node-explorer__pending ul li, .sml-node-explorer__chain ul li {
    background: rgba(0, 255, 255, 0.25);
    border-radius: 3px;
    margin: 1px;
    padding: 0 2px;
  }
  .sml-node-explorer__chain {
    display: block;
  }
  .sml-node-explorer__chain-block {
    font-family: monospace;
    font-size: 10pt;
    display: inline-block;
    background: rgba(255, 0, 255, 0.25);
    border: 1px solid transparent;
    border-radius: 3px;
    margin: 1px;
    cursor: pointer;
    line-height: 1;
    padding: 4px 2px;
  }
  .sml-node-explorer__chain-block--selected {
    border-color: var(--ui-border-inverted);
  }
</style>
