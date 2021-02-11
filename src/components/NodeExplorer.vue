<template>
  <div class="sml-node-explorer__container">
  <vue-resizable :drag-selector="'.sml-node-explorer__header'">
    <div class="sml-node-explorer">
      <div class="sml-node-explorer__header">Node Explorer</div>
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
        <span v-for="block in selectedNode.blockchain.chain" :key="block.length"><span class="sml-node-explorer__chain-block">Block_{{block.length}}</span> &rarr; </span>
      </div>
    </div>
  </vue-resizable>
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
  updateSelectedNode(node: any) {
    this.selectedNode = node;
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
    height: 600px;
    width: 260px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    text-align: left;
    padding: 5px;
    border: 2px solid var(--frame-border);
    background: var(--background-color);
    box-shadow: 0 0 8px var(--shadow-color);

    &__container {
      position: fixed;
      top: 25px;
      left: 25px;
      z-index: 200;
    }

    .vs__dropdown-toggle {
      border: 1px solid var(--frame-border);
    }

    h4 {
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
    &__pending {
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

    &__pending {
      max-height: 80px;
    }
    &__chain {
      max-height: 80px;
      display: block;

      &-block {
        font-family: monospace;
        font-size: 10pt;
        display: inline-block;
        background: rgba(magenta, 0.25);
        border-radius: 3px;
        margin: 1px;
      }
    }
  }
</style>
