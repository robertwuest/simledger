<template>
  <div class="sml-dashboard">
    <h1>Dashboard</h1>
    <GraphViewer ref="graphViewer" :selectedNodeId="selectedNodeId" :nodes="nodes" @node-clicked="onGraphNodeClicked"></GraphViewer>
    <NodeExplorer ref="nodeExplorer" :nodes="nodes" @node-changed="onExplorerNodeChanged"></NodeExplorer>
  </div>
</template>

<script lang="ts">

import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Component, Vue, Prop } from 'vue-property-decorator';
import vSelect from 'vue-select';
import GraphViewer from './GraphViewer.vue';
import NodeExplorer from './NodeExplorer.vue';
import { SystemNode } from '../network/system_node';
import SmlCommon from '../common';
import { System } from '../network/system';

gsap.registerPlugin(MotionPathPlugin);
Vue.component('v-select', vSelect);

@Component({
  components: {
    NodeExplorer,
    GraphViewer,
  },
})
export default class Dashboard extends Vue {
  @Prop({ default: () => [] }) nodes!: {
    systemNode: SystemNode,
    element?: HTMLDivElement,
    graphRef?: any,
  }[];
  get getNodes() {
    // eslint-disable-next-line
    return this.nodes.map((node) => {
      return {
        id: node.systemNode.id,
        node: node.systemNode,
      };
    });
  }
  selectedNodeId = 'asdasd';
  graphViewer!: GraphViewer;
  nodeExplorer!: NodeExplorer;
  system!: System;

  mounted() {
    this.graphViewer = this.$refs.graphViewer as GraphViewer;
    this.nodeExplorer = this.$refs.nodeExplorer as NodeExplorer;

    // Genesis account from private key -- (!) hardcoded private key
    const genesisAcc = SmlCommon.generateKeyPair('9QpiFVXv6HNP47u2ZYGQ5anz9GigfM4JxLbvyYCfd9W');

    // Setup system and two example nodes
    this.system = new System();
    this.system.start();

    const bobNode = this.addNode('Bob');
    const aliceNode = this.addNode('Alice');
    const frankNode = this.addNode('Frank');
    const graceNode = this.addNode('Grace');
    this.connectNodes(bobNode, aliceNode);
    this.connectNodes(aliceNode, frankNode);
    this.connectNodes(frankNode, graceNode);

    /* eslint-disable */
    setTimeout(() => {
      // transfer initial coins to bob to start
      this.orderTransaction(bobNode.systemNode.address, 100.0, genesisAcc, bobNode);

      // bob mines the transactions including his own
      bobNode.systemNode.startMining(() => {
        setTimeout(() => {
          this.orderTransaction(frankNode.systemNode.address, 50.0, bobNode.systemNode.keyPair, graceNode);
          setTimeout(() => {
            frankNode.systemNode.startMining(() => {
              setTimeout(() => {
                aliceNode.systemNode.startMining();
              }, 5000);
            });
          }, 5000);
        },5000);
      });
    }, 1000);
    /* eslint-enable */
  }

  /**
   * Add a new node to the network
   * @param id
   */
  addNode(id: string): any {
    if (!this.nodes.find(item => item.systemNode.id === id)) {
      const node = { systemNode: new SystemNode(id, this.system), graphRef: this.graphViewer.addNode(id) };
      node.systemNode.eventEmitter.subscribe({ next: (event) => { this.onSystemNodeEvent(event, node); } });
      this.nodes.push(node);
      return node;
    }
    return this.nodes.find(item => item.systemNode.id === id);
  }

  /**
   * Establish a virtual connection between to nodes of the network
   * @param nodeA
   * @param nodeB
   */
  connectNodes(nodeA: any, nodeB: any) {
    if (nodeA.systemNode.connectToNode(nodeB.systemNode)) {
      this.graphViewer.connectNodes(nodeA.systemNode.id, nodeB.systemNode.id);
    }
  }

  /**
   * When the node selection in the explorer is changed
   * @param node
   */
  onGraphNodeClicked(nodeId: string) {
    // eslint-disable-next-line
    const found = this.nodes.find((node) => { return node.systemNode.id === nodeId; });

    if (found) {
      this.nodeExplorer.selectedNode = found.systemNode;
      this.selectedNodeId = nodeId;
    }
  }

  /**
   * When the node selection in the explorer is changed
   * @param node
   */
  onExplorerNodeChanged(nodeId: string) {
    this.selectedNodeId = nodeId;
  }

  /**
   * Handle events on the nodes and visualize
   * @param event
   * @param sender
   */
  onSystemNodeEvent(event: any, sender: any) {
    if (sender.graphRef) {
      sender.graphRef.edges.forEach((edge: any) => {
        if (event.msg === SystemNode.events.BROADCAST_TX) {
          if (sender.systemNode.id === event.referrer.id ||
            (edge.source.id !== event.referrer.id && edge.target.id !== event.referrer.id)) {
            this.graphViewer.animateBroadcast('A → B', 'sml-graph-viewer__txdiv', sender.graphRef.id, edge);
          }
        }
        if (event.msg === SystemNode.events.BROADCAST_BLOCK) {
          if (sender.systemNode.id === event.referrer.id ||
            (edge.source.id !== event.referrer.id && edge.target.id !== event.referrer.id)) {
            this.graphViewer.animateBroadcast('<img src="img/icons/block.svg" alt="" />', 'sml-graph-viewer__blockdiv', sender.graphRef.id, edge);
          }
        }
      });
    }
  }

  /**
   * Order a transaction on a specific node
   * @param toAddress
   * @param amount
   * @param signingKey
   * @param issuingNode
   */
  orderTransaction(toAddress: string, amount: number, signingKey: any, issuingNode: any) {
    issuingNode.systemNode.orderTransaction(
      SmlCommon.HexToBase58(signingKey.getPublic(true, 'hex')),
      toAddress,
      amount,
      signingKey // eslint-disable-line
    );
  }
}
</script>

<style lang="scss">
  h3 {
    margin: 40px 0 0;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }

  a {
    color: #42b983;
  }
</style>
