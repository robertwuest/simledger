<!--
  GraphViewer Component

  Network topology visualization built on Vue Flow:
  - Custom nodes (NetworkNode) and floating edges (NetworkEdge)
  - Pan / zoom, controls, minimap and dotted background
  - Drag between node handles to connect peers, select an edge and press
    Backspace / Delete to disconnect them
  - Packets (transactions / blocks) animate along edges while being broadcast

  Nodes and edges are derived from the network store; Vue Flow only owns the
  node positions.
-->
<template>
  <div ref="root" class="sml-graph-viewer" data-testid="graph-viewer">
    <ClientOnly>
      <VueFlow
        :id="FLOW_ID"
        v-model:nodes="flowNodes"
        :edges="flowEdges"
        :connection-mode="ConnectionMode.Loose"
        :delete-key-code="['Backspace', 'Delete']"
        :min-zoom="0.2"
        :max-zoom="2.5"
        :edges-updatable="false"
        class="sml-graph-viewer__flow"
        @node-click="onNodeClick"
        @connect="onConnect"
        @edges-change="onEdgesChange"
        @nodes-initialized="onNodesInitialized"
        @move-start="onMoveStart"
      >
        <template #node-network="{ id }">
          <NetworkNode :id="id" />
        </template>
        <template #edge-network="edgeProps">
          <NetworkEdge v-bind="edgeProps" />
        </template>
        <Background :gap="30" :size="1.4" class="sml-graph-viewer__background" />
        <Panel position="top-left">
          <GraphToolbar
            :running="network.running.value"
            @add-node="addNode"
            @layout="autoLayout"
            @fit="fit"
            @toggle-simulation="toggleSimulation"
          />
        </Panel>
        <Controls position="bottom-left" :show-interactive="false" />
        <MiniMap position="bottom-right" pannable zoomable :node-color="minimapColor" :width="140" :height="90" />
      </VueFlow>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import {
  ConnectionMode,
  Panel,
  VueFlow,
  useVueFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeMouseEvent,
} from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import NetworkNode from './NetworkNode.vue';
import NetworkEdge from './NetworkEdge.vue';
import GraphToolbar from './GraphToolbar.vue';
import { useNetwork } from '~/composables/useNetwork';
import { computeSpringLayout, type Point } from '~/utils/graph/spring-layout';
import { nodeColor } from '~/utils/graph/colors';

const FLOW_ID = 'sml-network';
const NODE_WIDTH = 150;

const network = useNetwork();
const { fitView } = useVueFlow(FLOW_ID);

// Shallow: Vue Flow replaces the array on every change (v-model), positions need no deep tracking
const flowNodes = shallowRef<Node[]>([]);
const root = ref<HTMLElement>();
let nodesReady = false;
/** Set once the user pans or zooms; until then the graph is re-fitted when its pane resizes */
let viewAdjusted = false;
let resizeObserver: ResizeObserver | undefined;
let fitFrame: number | null = null;

const flowEdges = computed<Edge[]>(() => network.edges.value.map(edge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: 'network',
})));

function layoutPositions(ids: readonly string[]): Record<string, Point> {
  const edges = network.edges.value
    .filter(edge => ids.includes(edge.source) && ids.includes(edge.target))
    .map(edge => [edge.source, edge.target] as const);
  return computeSpringLayout(ids, edges);
}

/** Position for a node added to an existing graph: right of the current bounding box */
function appendPosition(index: number): Point {
  const xs = flowNodes.value.map(node => node.position.x);
  const ys = flowNodes.value.map(node => node.position.y);
  const maxX = Math.max(...xs, 0);
  const avgY = ys.length ? ys.reduce((sum, y) => sum + y, 0) / ys.length : 0;
  return { x: maxX + NODE_WIDTH + 80, y: Math.round(avgY + index * 110) };
}

function toFlowNode(id: string, position: Point): Node {
  return { id, type: 'network', position, deletable: false, data: {} };
}

watch(network.nodeIds, (ids) => {
  const kept = flowNodes.value.filter(node => ids.includes(node.id));
  const known = new Set(kept.map(node => node.id));
  const added = ids.filter(id => !known.has(id));
  if (!added.length && kept.length === flowNodes.value.length) {
    return;
  }
  const positions = kept.length === 0 ? layoutPositions(added) : null;
  flowNodes.value = [
    ...kept,
    ...added.map((id, index) => toFlowNode(id, positions?.[id] ?? appendPosition(index))),
  ];
}, { immediate: true });

function onNodeClick({ node }: NodeMouseEvent) {
  network.select(node.id);
}

function onConnect(connection: Connection) {
  network.connect(connection.source, connection.target);
}

function onEdgesChange(changes: EdgeChange[]) {
  changes.forEach((change) => {
    if (change.type === 'remove') {
      network.disconnect(change.source, change.target);
    }
  });
}

function onNodesInitialized() {
  if (!nodesReady) {
    nodesReady = true;
    scheduleFit();
  }
}

/**
 * Fit on the next frame: Vue Flow updates its viewport size from its own ResizeObserver,
 * fitting synchronously would use the previous pane size.
 */
function scheduleFit() {
  if (fitFrame === null) {
    fitFrame = requestAnimationFrame(() => {
      fitFrame = null;
      fit();
    });
  }
}

function onMoveStart() {
  viewAdjusted = true;
}

onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !root.value) {
    return;
  }
  resizeObserver = new ResizeObserver(() => {
    if (nodesReady && !viewAdjusted) {
      scheduleFit();
    }
  });
  resizeObserver.observe(root.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  if (fitFrame !== null) {
    cancelAnimationFrame(fitFrame);
  }
});

function fit() {
  fitView({ padding: 0.2, duration: 300 });
}

function autoLayout() {
  const positions = layoutPositions(flowNodes.value.map(node => node.id));
  flowNodes.value = flowNodes.value.map(node => ({ ...node, position: positions[node.id] ?? node.position }));
  setTimeout(fit, 0);
}

function addNode() {
  const node = network.addNode(network.nextNodeName());
  network.select(node.id);
}

function toggleSimulation() {
  if (network.running.value) {
    network.stop();
  } else {
    network.start();
  }
}

function minimapColor(node: Node) {
  return nodeColor(network.nodeIds.value.indexOf(node.id));
}

defineExpose({ flowNodes, flowEdges, autoLayout, fit, onConnect, onEdgesChange, onNodeClick });
</script>

<style>
.sml-graph-viewer {
  position: relative;
  flex-grow: 1;
  min-height: 0;
}
.sml-graph-viewer__flow {
  position: absolute;
  inset: 0;
}
.sml-graph-viewer__background {
  color: var(--ui-border-accented);
}
.sml-graph-viewer__background .vue-flow__background-pattern circle,
.sml-graph-viewer__background pattern circle {
  fill: var(--ui-border-accented);
}
.sml-graph-viewer .vue-flow__node-network {
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 12px;
}
.sml-graph-viewer .vue-flow__edge-path {
  stroke: var(--ui-text-muted);
  stroke-width: 2;
}
.sml-graph-viewer .vue-flow__connection-path {
  stroke: var(--ui-primary);
  stroke-width: 2;
}
.sml-graph-viewer .vue-flow__controls {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  box-shadow: none;
}
.sml-graph-viewer .vue-flow__controls-button {
  background: var(--ui-bg-elevated);
  border-bottom: 1px solid var(--ui-border);
  color: var(--ui-text);
}
.sml-graph-viewer .vue-flow__controls-button svg {
  fill: currentColor;
}
.sml-graph-viewer .vue-flow__controls-button:hover {
  background: var(--ui-bg-accented);
}
.sml-graph-viewer .vue-flow__minimap {
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--ui-bg-elevated);
}
.sml-graph-viewer .vue-flow__minimap-mask {
  fill: var(--ui-bg-muted);
  fill-opacity: 0.6;
}
</style>
