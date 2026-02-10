<template>
  <div class="sml-graph-viewer" ref="graphViewer">
    <div class="sml-graph-viewer__nodes">
      <div id="canvas" class="canvas" v-on:click="closeAllContextMenus()">
        <div v-bind:class="{ 'sml-graph-viewer__node--mining' : node.systemNode.isMining === true, 'sml-graph-viewer__node--selected': node.systemNode.id === selectedNodeId }"
            class="sml-graph-viewer__node"
            v-for="(node, index) in nodes"
            :key="node.systemNode.id" :id="node.systemNode.id" >
          <h3>{{ node.systemNode.id }}</h3>
          <div>Balance: {{ node.systemNode.getBalance() }}</div>
          <img class="sml-graph-viewer__node-process" :src="`/img/icons/gears.svg`" alt="" fill="#FF0000"/>
          <img class="sml-graph-viewer__node-pow-lottery" :src="`/img/icons/die${ node.systemNode.miningDelay + 1 }.svg`" alt=""/>
          <div class="sml-graph-viewer__node-progress-bar"><span v-bind:style="{ width: node.systemNode.isMining ? '100%' : '0', transitionDuration: ((node.systemNode.miningDelay + 1)*2) + 's' }"></span></div>
          <img class="sml-graph-viewer__node-error" :src="`/icons/error.svg`" alt=""/>
          <div class="sml-graph-viewer__node-connector">
            <img class="connect" :src="`/img/icons/connect.svg`" alt="" v-on:click="$event.target.parentElement.classList.toggle('open'); $event.stopPropagation()"/>
            <div class="c-menu">
              <div class="c-menu-item" v-for="subNode in nodes.filter(nd => nd.systemNode.id !== node.systemNode.id)" :key="`${subNode.systemNode.id}-menu-${index}`" v-on:click="connectDisconnectNodes(subNode.systemNode, node.systemNode)">
                {{subNode.systemNode.id}}
                <img v-if="node.systemNode.connectedNodes.find(nd => nd.node.id === subNode.systemNode.id)" :src="`/img/icons/connected.svg`" alt=""/>
                <img v-if="!node.systemNode.connectedNodes.find(nd => nd.node.id === subNode.systemNode.id)" :src="`/img/icons/disconnected.svg`" alt=""/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>



<script setup lang="ts">
import { ref, onMounted, defineProps, defineEmits, defineExpose } from 'vue';
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { SystemNode } from '../../src/network/system_node';
import { vi } from '@nuxt/ui/runtime/locale/index.js';


gsap.registerPlugin(MotionPathPlugin);

const props = defineProps<{
  nodes: {
    systemNode: SystemNode,
    element?: HTMLDivElement | null,
    graphRef?: any,
  }[],
  selectedNodeId: string
}>();
const emit = defineEmits(["node-clicked", "graph-ready"]);

const graphViewer = ref<HTMLDivElement>();
const visualGraph = ref<any>();
const renderer = ref<any>();
const layout = ref<any>();
let browserDarkMode = false;

onMounted(async () => {
  const Graph = (await import('../../src/dracula')).Graph;
  const Layout = (await import('../../src/dracula')).Layout;
  const Renderer = (await import('../../src/dracula')).Renderer;
  browserDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // drag move element in svg
  window.addEventListener('shapeDragMove', (event: any) => {
    closeAllContextMenus();
    if (props.nodes) {
      const item = props.nodes.find((node: any) => {
        return node.graphRef.shape.items.find((shapeItem:any) => shapeItem.id === event.detail.item.id);
      });
      if (item && item.element) {
        item.element.style.transform = `translate(${event.detail.x}px, ${event.detail.y}px)`;
      }
    }
  });
  window.addEventListener('viewDragMove', (event: any) => {
    closeAllContextMenus();
    props.nodes.forEach((node: any) => {
      const shapeBounds = node.graphRef.shape.items[0].node.getBoundingClientRect();
      const parentBounds = node.graphRef.shape.items[0].node.parentElement.getBoundingClientRect();
      node.element.style.transform = `translate(${shapeBounds.x - parentBounds.x}px, ${shapeBounds.y - parentBounds.y}px)`;
    });
  });
  window.addEventListener("resize", onResize);
  visualGraph.value = new Graph();
  setTimeout(() => {
    const element = graphViewer.value as HTMLDivElement;
    emit('graph-ready');
    layout.value = new Layout.Spring(visualGraph.value);
    renderer.value = new Renderer.Raphael('#canvas', visualGraph.value, element.clientWidth, element.clientHeight);
    renderer.value.draw();
    props.nodes.forEach((node: any) => {
      if (!node.element) {
        setTimeout(() => {
        node.element = document.querySelector(`#${node.systemNode.id}`);
        const shapeBounds = node.graphRef.shape.items[0].node.getBoundingClientRect();
        const parentBounds = node.graphRef.shape.items[0].node.parentElement.getBoundingClientRect();
        node.element.style.transform = `translate(${shapeBounds.x - parentBounds.x}px, ${shapeBounds.y - parentBounds.y}px)`;
        }, 0);
      }
    });
  }, 1);
});

/**
 * Closes all open context menus for node connections
 * Prevents menu overlap when clicking elsewhere on canvas
 */
function closeAllContextMenus() {
  props.nodes.forEach((node: any) => {
    node.element.querySelector('.sml-graph-viewer__node-connector').classList.remove('open');
  });
}

/**
 * Handles canvas resize by updating SVG dimensions and viewBox
 * Maintains responsive layout when container size changes
 */
function onResize() {
  const element = graphViewer.value as HTMLDivElement;
  const svg = element.querySelector('svg') as SVGElement;
  renderer.value.canvas.setSize(element.clientWidth, element.clientHeight);
  const viewBox = svg.hasAttribute('viewBox') ? svg.getAttribute('viewBox').split(' ').map(Number) : [0, 0, element.clientWidth, element.clientHeight];
  viewBox[2] = element.clientWidth;
  viewBox[3] = element.clientHeight;
  svg.setAttribute('viewBox', viewBox.join(' '));
}

/**
 * Adds a new node to the graph visualization
 * @param {string} nodeId - The node's unique identifier
 * @returns {DraculaNode} The created graph node object with shape and click handler
 */
function addNode(nodeId: string) {
  const graphNode = visualGraph.value.addNode(nodeId);
  setTimeout(() => {
    graphNode.shape.items[0].node.addEventListener('click', () => {
      emit('node-clicked', nodeId);
    });
  },0);
  return graphNode;
}

/**
 * Creates a directed edge between two nodes
 * Edge color adapts to dark/light mode for optimal visibility
 * @param {string} nodeAId - Source node ID
 * @param {string} nodeBId - Target node ID
 */
function connectNodes(nodeAId: string, nodeBId: string) {
  const edgeColor = browserDarkMode ? 'whitesmoke' : '#1c2f21';
  visualGraph.value.addEdge(nodeAId, nodeBId, { style: { stroke: edgeColor } });
}

/**
 * Removes an edge between two nodes from the visualization
 * @param {string} nodeAId - Source node ID
 * @param {string} nodeBId - Target node ID
 */
function disconnectNodes(nodeAId: string, nodeBId: string) {
  visualGraph.value.removeEdge(nodeAId, nodeBId);
}

/**
 * Toggles network connection between two nodes
 * Bidirectional: connects both nodes to each other
 * Updates both system nodes and the visualization graph
 * @param {SystemNode} nodeA - First network node
 * @param {SystemNode} nodeB - Second network node
 */
function connectDisconnectNodes(nodeA: any, nodeB: any) {
  if (nodeA.connectedNodes.find((nd: any) => nd.node.id === nodeB.id)) {
    nodeA.forgetNode(nodeB.id);
    nodeB.forgetNode(nodeA.id);
    disconnectNodes(nodeA.id, nodeB.id);
    return;
  }
  if (nodeA.connectToNode(nodeB)) {
    connectNodes(nodeA.id, nodeB.id);
  }
  redraw();
}

function redraw() {
  renderer.value.draw();
}

/**
 * Animates content (transaction/block) flowing along a network edge
 * Uses GSAP MotionPath to smoothly traverse the SVG edge path over 2 seconds
 * Direction determined by whether sourceId matches the edge's source node
 * @param {string} content - HTML content to animate
 * @param {string} cssClass - CSS class for styling the animated element
 * @param {string} sourceId - Source node ID (determines animation direction)
 * @param {DraculaEdge} edge - The edge path to animate along
 */
function animateBroadcast(content: string, cssClass: string, sourceId: string, edge: any) {
  const element = document.createElement('div');
  const gsapAnimationObject = {
    duration: 2,
    ease: 'power1.inOut',
    motionPath: {
      path: edge.shape.fg.node,
      align: edge.shape.fg.node,
      alignOrigin: [0.5, 0.5],
    },
    onComplete: () => {
      element.remove();
    },
  };
  element.classList.add(cssClass);
  element.innerHTML = content;
  (graphViewer.value as HTMLDivElement).appendChild(element);
  if (sourceId === edge.source.id) {
    gsap.to(element, gsapAnimationObject);
  } else {
    gsap.from(element, gsapAnimationObject);
  }
}

defineExpose({
  addNode,
  connectNodes,
  disconnectNodes,
  connectDisconnectNodes,
  animateBroadcast,
  onResize,
  redraw,
  closeAllContextMenus
});
</script>

<style>
  .sml-graph-viewer {
    position: relative;
    height: 100%;
  }
  .sml-graph-viewer__txdiv, .sml-graph-viewer__blockdiv {
    position: absolute;
    padding: 2px;
    border-radius: 5px;
    line-height: 1;
    border: 1px solid grey;
    background: rgba(0, 255, 255, 0.6);
    animation: tx-fadeout 2s;
  }
  .sml-graph-viewer__blockdiv {
    background: rgba(255, 0, 255, 0.6);
  }
  .sml-graph-viewer__blockdiv img {
    width: 25px;
    height: 25px;
  }
  .sml-graph-viewer__nodes {
    position: relative;
    overflow: hidden;
    min-width: 100%;
    min-height: 100%;
    display: flex;
  }
  .sml-graph-viewer__nodes .canvas {
    background-image: radial-gradient(circle, var(--ui-border-accented) 1.1px, transparent 1px);
    background-size: 30px 30px;
    min-width: 100%;
    min-height: 100%;
    max-width: 100%;
    max-height: 100%;
    position: absolute;
  }
  .sml-graph-viewer__nodes .canvas svg {
    overflow: hidden;
  }
  .sml-graph-viewer__node {
    top: 0;
    left: 0;
    width: 150px;
    height: 80px;
    max-height: 80px;
    max-width: 150px;
    border-radius: 12px;
    text-align: left;
    position: absolute;
    pointer-events: none;
    z-index: 100;
  }
  .sml-graph-viewer__node h3 {
    margin: 10px 0 0 10px;
    font-weight: bold;
  }
  .sml-graph-viewer__node > div {
    margin-left: 10px;
  }
  .sml-graph-viewer__node-process {
    width: 30px;
    height: 30px;
    position: absolute;
    top: 5px;
    right: 5px;
    display: none;
  }
  .sml-graph-viewer__node-pow-lottery {
    width: 25px;
    height: 25px;
    position: absolute;
    bottom: 5px;
    right: 5px;
    display: none;
  }
  .sml-graph-viewer__node.error .sml-graph-viewer__node-error {
    display: block;
  }
  .sml-graph-viewer__node-error {
    pointer-events: none;
    animation-duration: 2s;
    animation-name: flash;
    opacity: 0;
    display: none;
  }
  .sml-graph-viewer__node-error.show {
    display: block;
  }
  @keyframes flash {
    0% {
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  .sml-graph-viewer__node-progress-bar {
    visibility: hidden;
    border: 1px solid white;
    border-radius: 6px;
    margin-top: 3px;
    width: 65%;
    padding: 1px;
  }
  @media (prefers-color-scheme: light) {
    .sml-graph-viewer__node-progress-bar {
      border-color: black;
    }
  }
  .sml-graph-viewer__node-progress-bar span {
    display: block;
    width: 0;
    height: 8px;
    background-color: white;
    border-radius: 4px;
    transition: width 0.2s ease;
  }
  @media (prefers-color-scheme: light) {
    .sml-graph-viewer__node-progress-bar span {
      background-color: black;
    }
  }
  .sml-graph-viewer__node-connector {
    pointer-events: all;
    position: absolute;
    top: 5px;
    right: 5px;
  }
  .sml-graph-viewer__node-connector .connect {
    width: 22px;
    height: 22px;
  }
  @media (prefers-color-scheme: dark) {
    .sml-graph-viewer__node-connector .connect {
      filter: invert(1);
    }
  }
  .sml-graph-viewer__node-connector.open .c-menu {
    display: block;
  }
  .sml-graph-viewer__node-connector .c-menu {
    display: none;
    position: absolute;
    border: 1px solid var(--frame-border);
    background-color: var(--ui-bg);
    border-radius: 6px;
    right: -4px;
    bottom: calc(100% + 8px);
  }
  .sml-graph-viewer__node-connector .c-menu-item {
    display: flex;
    justify-content: space-between;
    padding: 2px 4px;
    cursor: pointer;
  }

  .sml-graph-viewer__node-connector .c-menu-item:hover {
    background-color: var(--background-2-color);
  }
  .sml-graph-viewer__node-connector .c-menu-item img {
    width: 16px;
    max-width: fit-content;
    margin-left: 5px;
  }
  @media (prefers-color-scheme: dark) {
    .sml-graph-viewer__node-connector .c-menu-item img {
      filter: invert(1);
    }
  }
  .sml-graph-viewer__node--mining .sml-graph-viewer__node-connector {
    display: none;
  }
  .sml-graph-viewer__node--mining .sml-graph-viewer__node-process {
    display: block;
  }
  @media (prefers-color-scheme: light) {
    .sml-graph-viewer__node--mining .sml-graph-viewer__node-process {
      filter: invert(1);
    }
  }
  .sml-graph-viewer__node--mining .sml-graph-viewer__node-pow-lottery, .sml-graph-viewer__node--mining .sml-graph-viewer__node-progress-bar {
    display: block;
    visibility: visible;
  }
  .sml-graph-viewer__node--selected {
    box-shadow: 0 0 12px var(--shadow-color);
  }
  @keyframes tx-fadeout {
    60% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
