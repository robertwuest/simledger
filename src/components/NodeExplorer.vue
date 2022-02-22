<template>
  <div class="sml-node-explorer__container">
    <div class="sml-node-explorer">
      <v-select label="id" :options="getNodes" :clearable="false" :value="selectedNode ? selectedNode.id : 'Choose Node'" @input="updateSelectedNode($event.node)"></v-select>
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
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';
import vSelect from 'vue-select';
import VueResizable from 'vue-resizable/src/components/vue-resizable.vue';
import { SystemNode } from '../network/system_node';

Vue.component('v-select', vSelect);

@Component({
  components: {
    VueResizable,
  },
})
export default class NodeExplorer extends Vue {
  @Prop() nodes!: {
    systemNode: SystemNode,
    element?: HTMLDivElement,
    graphRef?: any,
  }[];
  get getNodes() {
    // eslint-disable-next-line
    return this.nodes.map((node) => {
      return { id: node.systemNode.id, node: node.systemNode };
    });
  }
  selectedNode: SystemNode|null = null;
  selectedBlockIndex = -1;

  updateSelectedNode(node: any) {
    this.selectedNode = node;
    this.selectedBlockIndex = -1;
    if (this.selectedNode) {
      this.$emit('node-changed', this.selectedNode.id);
    }
  }

  findAddressId(address: string) {
    if (address === '_') {
      return '&#9889;'; // Mining transaction source
    }
    if (this.nodes.length > 0 && address === this.nodes[0].systemNode.blockchain.genesisAddress) {
      return '&#127878; Genesis'; // Genesis transaction source
    }
    const node = this.nodes.find(item => item.systemNode.address === address);
    if (node) {
      return node.systemNode.id;
    }
    return `${address.substring(0, 6)}...`;
  }
}
</script>

<style lang="scss">
  .sml-node-explorer {
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    text-align: left;
    padding: 5px;

    .vs__dropdown-toggle {
      border: 1px solid var(--frame-border);
    }

    h4, h5 {
      margin: 0;
    }

    &__header {
      font-weight: bold;
    }

    .v-select,
    &__ledger,
    &__pending{
      margin-bottom: 4px;
    }

    &__ledger,
    &__pending,
    &__chain {
      flex-grow: 1;
      border: 1px solid var(--frame-border);
      display: flex;
      flex-direction: column;
      ul {
        font-family: monospace;
        font-size: 10pt;
      }
    }

    &__ledger,
    &__pending,
    &__chain {
      ul {
        line-height: 1.5;
        margin: 0;
        display: flex;
        flex-direction: column;

        li {
          background: rgba(cyan, 0.25);
          border-radius: 3px;
          margin: 1px;
          vertical-align: baseline;
        }
      }
    }

    &__chain {
      display: block;

      &-block {
        font-family: monospace;
        font-size: 10pt;
        display: inline-block;
        background: rgba(magenta, 0.25);
        border-radius: 3px;
        margin: 1px;
        cursor: pointer;
        line-height: 1;
        padding: 4px 2px;

        &--selected {
          border: 1px solid var(--frame-border);
        }
      }
    }
  }
</style>
