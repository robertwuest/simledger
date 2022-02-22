<template>
  <div class="sml-node-editor__container">
    <div class="sml-node-editor">
      <div class="sml-node-editor__control" v-if="selectedNode"><h4>Add Transaction</h4>
        <div class="sml-node-editor__tx">
          From: <v-select label="id" v-model="fromNode" :options="getNodes" :clearable="false"></v-select>
          To: <v-select label="id" v-model="toNode" :options="getNodes" :clearable="false"></v-select>
          Amount: <input type="number" v-model="txAmount" />
        </div>
        <button v-on:click="orderTransaction()">Add Transaction</button>
      </div>
      <div class="sml-node-editor__control" v-if="selectedNode"><h4>Controls</h4>
        <button v-on:click="minePendingTransactions()">Mine New Block</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
import vSelect from 'vue-select';
import VueResizable from 'vue-resizable/src/components/vue-resizable.vue';
import { SystemNode } from '../network/system_node';

Vue.component('v-select', vSelect);

@Component({
  components: {
    VueResizable,
  },
})
export default class NodeEditor extends Vue {
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
  @Prop() selectedNodeId!: string;

  selectedNode: {
    systemNode: SystemNode,
    element?: HTMLDivElement,
    graphRef?: any,
  } | any = null;

  fromNode = null;
  toNode = null;
  txAmount = 0.0;

  @Watch('selectedNodeId')
  onPropertyChanged(value: string, oldValue: string) {
    this.selectedNode = this.getCurrentNode();
  }

  getCurrentNode() {
    return this.nodes.find(node => node.systemNode.id === this.selectedNodeId);
  }

  orderTransaction() {
    if (this.fromNode && this.toNode && this.txAmount > 0) {
      this.selectedNode.systemNode.orderTransaction(this.fromNode.node.address, this.toNode.node.address, this.txAmount, this.fromNode.node.keyPair);
    }
  }

  minePendingTransactions() {
    this.selectedNode.systemNode.startMining();
  }
}
</script>

<style lang="scss">
  .sml-node-editor {
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    text-align: left;
    padding: 5px;

    h4, h5 {
      margin: 0;
    }

    &__tx {
      display: flex;
      align-items: center;
      margin-bottom: 8px;

      .v-select {
        flex-grow: 1;
      }
    }

    &__control {
      padding: 5px;
      flex-grow: 1;
      border: 1px solid var(--frame-border);
      display: flex;
      flex-direction: column;
    }
  }
</style>
