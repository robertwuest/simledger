

<template>
  <div class="sml-dashboard">
  <splitpanes class="default-theme" horizontal
              @resize="resizePane($event)"
              @resized="paneResized($event)">
    <pane size="65" class="sml-dashboard__container">
        <div class="sml-dashboard__heading">Graph Viewer</div>
        <GraphViewer ref="graphViewer" :selectedNodeId="selectedNodeId" :nodes="nodes" @node-clicked="onGraphNodeClicked"  @graph-ready="onGraphReady"></GraphViewer>
    </pane>
    <pane>
      <splitpanes class="default-theme" vertical>
        <pane class="sml-dashboard__container">
          <div class="sml-dashboard__heading">Explorer</div>
          <NodeExplorer ref="nodeExplorer" :nodes="nodes" @node-changed="onExplorerNodeChanged"></NodeExplorer>
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
import { System } from '~~/src/network/system';
import { defineExpose } from 'vue';

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

function connectNodes(nodeA: any, nodeB: any) {
  if (nodeA.systemNode.connectToNode(nodeB.systemNode)) {
    graphViewer.value?.connectNodes(nodeA.systemNode.id, nodeB.systemNode.id);
  }
}

function onGraphNodeClicked(nodeId: string) {
  const found = props.nodes.find(node => node.systemNode.id === nodeId);
  if (found) {
    nodeExplorer.value?.updateSelectedNode(found.systemNode);
    selectedNodeId.value = nodeId;
  }
}

function onExplorerNodeChanged(nodeId: string) {
  selectedNodeId.value = nodeId;
}

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
