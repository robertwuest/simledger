

<!--
  Dashboard Component
  
  Main layout component orchestrating the blockchain network simulator.
  Manages the layout of three sub-components:
  - GraphViewer (65%): Network topology visualization
  - NodeExplorer (right top): Blockchain state explorer
  - NodeEditor (right bottom): Node creation and transaction interface
  
  Props:
  - nodes: Array of node objects in the network
  
  Events:
  - dashboard-ready: Emitted when dashboard is fully initialized
  
  Exposed methods:
  - addNode(id): Create a new node in the network
  - connectNodes(nodeA, nodeB): Connect two nodes
  - orderTransaction(fromAddress, toAddress, amount, signingKey, issuingNode): Send transaction
-->
<template>
  <div class="sml-dashboard">
  <splitpanes class="default-theme" horizontal
              @resize="resizePane($event)"
              @resized="paneResized($event)">
    <pane size="65">
                    <splitpanes class="default-theme" vertical
                    @resize="resizePane($event)"
              @resized="paneResized($event)">
    <pane size="75" class="sml-dashboard__container">

        <div class="sml-dashboard__heading">Graph Viewer</div>
        <GraphViewer ref="graphViewer" :selectedNodeId="selectedNodeId" :nodes="nodes" @node-clicked="onGraphNodeClicked"  @graph-ready="onGraphReady"></GraphViewer>
    </pane>
    <pane class="sml-dashboard__container">
                <div class="sml-dashboard__heading">Explorer</div>
          <NodeExplorer ref="nodeExplorer" :nodes="nodes" @node-changed="onExplorerNodeChanged"></NodeExplorer>
    </pane>
    </splitpanes>
    </pane>
    <pane>
      <splitpanes class="default-theme" vertical>
        <pane class="sml-dashboard__container">
          <div class="sml-dashboard__heading">Console</div>
          <LogConsole :nodes="nodes" />
        </pane>
        <pane class="sml-dashboard__container">
          <div class="sml-dashboard__heading">Editor</div>
          <NodeEditor ref="nodeEditor" :nodes="nodes" :selectedNodeId="selectedNodeId"></NodeEditor>
        </pane>
      </splitpanes>
    </pane>
  </splitpanes>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import { SystemNode } from '~~/src/network/system_node';
import GraphViewer from './graphviewer.vue';
import NodeExplorer from './nodeexplorer.vue';
import NodeEditor from './nodeeditor.vue';
import LogConsole from './logconsole.vue';
import { System } from '~~/src/network/system';

gsap.registerPlugin(MotionPathPlugin);

const props = defineProps<{
  nodes: {
    systemNode: SystemNode,
    element?: HTMLDivElement | null,
    graphRef?: any,
  }[]
}>();

const emit = defineEmits(['dashboard-ready']);

const selectedNodeId = ref('');
const graphViewer = ref<InstanceType<typeof GraphViewer>>();
const nodeExplorer = ref<InstanceType<typeof NodeExplorer>>();
const nodeEditor = ref<InstanceType<typeof NodeEditor>>();
const system = ref<System>();

function onGraphReady() {
  emit('dashboard-ready');
}

function getNodes() {
  return props.nodes.map(node => ({
    id: node.systemNode.id,
    node: node.systemNode,
  }));
}

/**
 * Creates a new node in the network with blockchain instance
 * Automatically adds node to graph visualization
 * Subscribes to node events for animation and error handling
 * @param {string} id - Unique identifier for the new node
 * @returns {Object} Node object with systemNode, graphRef, and element properties
 */
function addNode(id: string): any {
  const found = props.nodes.find(item => item.systemNode.id === id);
  if (!found) {
    const node : {
      systemNode: SystemNode,
      graphRef?: any,
      element?: any,
    } = {
      systemNode: new SystemNode(id, system.value!),
      graphRef: graphViewer.value?.addNode(id),
    };
    node.systemNode.eventEmitter.subscribe({ next: (event: any) => { onSystemNodeEvent(event, node); } });
    props.nodes.push(node);
    setTimeout(() => {
      if (!node.element) {
        node.element = document.querySelector(`#${node.systemNode.id}`);
        const shapeBounds = node.graphRef.shape.items[0].node.getBoundingClientRect();
        const parentBounds = node.graphRef.shape.items[0].node.parentElement.getBoundingClientRect();
        if (node.element) {
          node.element.style.transform = `translate(${shapeBounds.x - parentBounds.x}px, ${shapeBounds.y - parentBounds.y}px)`;
        }
      }
    },0);
    return node;
  }
  return found;
}

function resizePane() {
  // resize event here
}

function paneResized() {
  graphViewer.value?.onResize();
}

/**
 * Connects two network nodes bidirectionally
 * Updates both system network and graph visualization
 * @param {Object} nodeA - Node A with systemNode property
 * @param {Object} nodeB - Node B with systemNode property
 */
function connectNodes(nodeA: any, nodeB: any) {
  if (nodeA.systemNode.connectToNode(nodeB.systemNode)) {
    graphViewer.value?.connectNodes(nodeA.systemNode.id, nodeB.systemNode.id);
  }
}

/**
 * Handles graph node click events
 * Updates the explorer to show the selected node's blockchain state
 * @param {string} nodeId - The clicked node's ID
 */
function onGraphNodeClicked(nodeId: string) {
  const found = props.nodes.find(node => node.systemNode.id === nodeId);
  if (found) {
    nodeExplorer.value?.updateSelectedNode(found.systemNode);
    selectedNodeId.value = nodeId;
  }
}

/**
 * Handles node selection change from the explorer
 * Updates the selected node ID for highlighting in the graph
 * @param {string} nodeId - The selected node's ID
 */
function onExplorerNodeChanged(nodeId: string) {
  selectedNodeId.value = nodeId;
}

/**
 * Processes system node events (mining, broadcasting, errors)
 * Animates transactions and blocks through the network
 * @param {Object} event - System event from node's eventEmitter
 * @param {Object} sender - The node that emitted the event
 */
function onSystemNodeEvent(event: any, sender: any) {
  if (sender.graphRef) {
    sender.graphRef.edges.forEach((edge: any) => {
      if (event.msg === SystemNode.events.BROADCAST_TX) {
        if (sender.systemNode.id === event.referrer.id ||
          (edge.source.id !== event.referrer.id && edge.target.id !== event.referrer.id)) {
          graphViewer.value?.animateBroadcast('A → B', 'sml-graph-viewer__txdiv', sender.graphRef.id, edge);
        }
      }
      if (event.msg === SystemNode.events.BROADCAST_BLOCK) {
        if (sender.systemNode.id === event.referrer.id ||
          (edge.source.id !== event.referrer.id && edge.target.id !== event.referrer.id)) {
          graphViewer.value?.animateBroadcast('<img src="img/icons/block.svg" alt="" />', 'sml-graph-viewer__blockdiv', sender.graphRef.id, edge);
        }
      }
      if (event.msg === SystemNode.events.MESSAGE && event.payload.type === 'warn') {
        sender.element.classList.toggle('error', true);
        setTimeout(() => {
          sender.element.classList.toggle('error', false);
        }, 2000);
      }
    });
  }
}

/**
 * Orders a transaction from one address to another
 * Signs with provided key and broadcasts to the network
 * @param {string} fromAddress - Sender's address
 * @param {string} toAddress - Recipient's address
 * @param {number} amount - Transaction amount in coins
 * @param {any} signingKey - ECDSA key for signing
 * @param {Object} issuingNode - Node object with systemNode property
 */
function orderTransaction(fromAddress: string, toAddress: string, amount: number, signingKey: any, issuingNode: { systemNode: SystemNode }) {
  issuingNode.systemNode.orderTransaction(
    fromAddress,
    toAddress,
    amount,
    signingKey
  );
}

onMounted(() => {
  graphViewer.value = (graphViewer.value ?? undefined) as InstanceType<typeof GraphViewer>;
  nodeExplorer.value = (nodeExplorer.value ?? undefined) as InstanceType<typeof NodeExplorer>;
  nodeEditor.value = (nodeEditor.value ?? undefined) as InstanceType<typeof NodeEditor>;

  // Setup system and two example nodes
  system.value = new System();
  system.value.start();
});

defineExpose({
  addNode,
  orderTransaction,
  connectNodes
});
</script>
<style>
@import '~~/node_modules/splitpanes/dist/splitpanes.css';
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

  .sml-dashboard {
    flex-grow: 1;
  }

  .sml-dashboard__heading {
    background: var(--ui-bg-elevated);
    font-weight: bold;
    text-align: left;
    padding: 2px 5px;
  }
  .sml-dashboard__container {
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .default-theme.splitpanes .splitpanes__pane {
    background-color: transparent;
  }
  .default-theme.splitpanes.default-theme.splitpanes--vertical > .splitpanes__splitter, .default-theme.splitpanes.splitpanes--horizontal > .splitpanes__splitter {
    background-color: var(--ui-bg-accented);
    border-color: transparent;
  }
  .default-theme.splitpanes.splitpanes--vertical > .splitpanes__splitter:before, .default-theme.splitpanes.splitpanes--horizontal > .splitpanes__splitter:before, .default-theme.splitpanes.splitpanes--vertical > .splitpanes__splitter:after, .default-theme.splitpanes.splitpanes--horizontal > .splitpanes__splitter:after {
    background-color: var(--ui-bg-muted);
  }

</style>
