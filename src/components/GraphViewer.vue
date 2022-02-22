<template>
  <div class="sml-graph-viewer" ref="graphViewer">
    <div class="sml-graph-viewer__nodes">
      <div id="canvas" class="canvas">
      </div>
      <div v-bind:class="{ 'sml-graph-viewer__node--mining' : node.systemNode.isMining === true, 'sml-graph-viewer__node--selected': node.systemNode.id === selectedNodeId }"
           class="sml-graph-viewer__node"
           v-for="node in nodes"
           :key="node.systemNode.id" :id="node.systemNode.id" >
        <h3>{{ node.systemNode.id }}</h3>
        <div>Balance: {{ node.systemNode.getBalance() }}</div>
        <img class="sml-graph-viewer__node-process" src="../assets/icons/gears.svg" alt="" fill="#FF0000"/>
        <img class="sml-graph-viewer__node-pow-lottery" :src="`/img/icons/die${ node.systemNode.miningDelay + 1 }.svg`" alt=""/>
        <div class="sml-graph-viewer__node-progress-bar"><span v-bind:style="{ width: `${ node.systemNode.getRemainingMiningDelayPercentage() }%` }"></span></div>
        <img class="sml-graph-viewer__node-error" :src="`/img/icons/error.svg`" alt=""/>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Component, Vue, Prop } from 'vue-property-decorator';
import { SystemNode } from '../network/system_node';
import Dracula from '../dracula';

gsap.registerPlugin(MotionPathPlugin);

@Component
export default class GraphViewer extends Vue {
  @Prop() nodes!: {
    systemNode: SystemNode,
    element?: HTMLDivElement,
    graphRef?: any,
  }[];
  @Prop() selectedNodeId!: string;
  visualGraph!: any;
  browserDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  renderer: any;
  layout: any;

  mounted() {
    window.addEventListener('shapeDragMove', (event: any) => {
      if (this.nodes) {
        // eslint-disable-next-line
        const item = this.nodes.find((node: any) => {
          // eslint-disable-next-line
          return node.graphRef.shape.items.find((shapeItem:any) => shapeItem.id === event.detail.item.id);
        });
        if (item && item.element) {
          item.element.style.transform = `translate(${event.detail.x}px, ${event.detail.y}px)`;
        }
      }
    });

    this.visualGraph = new Dracula.Graph();
    // refresh
    setTimeout(() => {
      const element = this.$refs.graphViewer as HTMLDivElement;
      // eslint-disable-next-line
      this.layout = new Dracula.Layout.Spring(this.visualGraph);
      this.renderer = new Dracula.Renderer.Raphael('#canvas', this.visualGraph, element.clientWidth, element.clientHeight);
      this.renderer.draw();
      this.nodes.forEach((node: any) => {
        if (!node.element) {
          node.element = document.querySelector(`#${node.systemNode.id}`);
          const shapeBounds = node.graphRef.shape.items[0].node.getBoundingClientRect();
          const parentBounds = node.graphRef.shape.items[0].node.parentElement.getBoundingClientRect();
          node.element.style.transform = `translate(${shapeBounds.x - parentBounds.x}px, ${shapeBounds.y - parentBounds.y}px)`;
        }
      });
    }, 1);
  }

  /**
   * Resize  canvas
   */
  onResize() {
    const element = this.$refs.graphViewer as HTMLDivElement;
    this.renderer.canvas.setSize(element.clientWidth, element.clientHeight);
  }

  /**
   * Add node to graph
   * @param nodeId
   */
  addNode(nodeId: string) {
    const graphNode = this.visualGraph.addNode(nodeId);
    setTimeout(() => {
      graphNode.shape.items[0].node.addEventListener('click', () => {
        this.$emit('node-clicked', nodeId);
      });
    }, 1);
    return graphNode;
  }

  /**
   * Establish a virtual connection between to nodes of the network
   * @param nodeAId
   * @param nodeBId
   */
  connectNodes(nodeAId: string, nodeBId: string) {
    const edgeColor = this.browserDarkMode ? 'whitesmoke' : '#1c2f21';
    this.visualGraph.addEdge(nodeAId, nodeBId, { style: { stroke: edgeColor } });
  }

  /**
   * Animate the broadcast event
   * @param content
   * @param cssClass
   * @param sourceId
   * @param edge
   */
  animateBroadcast(content: string, cssClass: string, sourceId: string, edge: any) {
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
    this.$el.appendChild(element);
    if (sourceId === edge.source.id) {
      gsap.to(element, gsapAnimationObject);
    } else {
      gsap.from(element, gsapAnimationObject);
    }
  }
}
</script>

<style lang="scss">
  .sml-graph-viewer {
    position: relative;
    height: 100%;

    &__txdiv,
    &__blockdiv {
      position: absolute;
      padding: 2px;
      border-radius: 5px;
      line-height: 1;
      border: 1px solid grey;
      background: rgba(cyan, 0.6);
      animation: tx-fadeout 2s;
    }

    &__blockdiv {
      background: rgba(magenta, 0.6);

      img {
        width: 25px;
        height: 25px;
      }
    }

    &__nodes {
      display: flex;
      height: 100%;

      .canvas {
        height: 100%;
        width: 100%;
        text-align: left;
      }
    }

    &__node {
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

      h3 {
        margin: 10px 0 0 10px;
      }

      div {
        margin-left: 10px;
      }

      &-process {
        width: 30px;
        height: 30px;
        position: absolute;
        top: 5px;
        right: 5px;
        display: none;
      }

      &-pow-lottery {
        width: 25px;
        height: 25px;
        position: absolute;
        bottom: 5px;
        right: 5px;
        display: none;
      }

      &.error {
        .sml-graph-viewer__node-error {
          display: block;
        }
      }

      &-error {
        pointer-events: none;
        animation-duration: 2s;
        animation-name: flash;
        opacity: 0;
        display: none;

        &.show {
          display: block;
        }
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

      &-progress-bar {
        display: none;
        border: 1px solid white;
        border-radius: 6px;
        margin-top: 3px;
        width: 65%;
        padding: 1px;
        @media (prefers-color-scheme: light) {
          border-color: black;
        }

        span {
          display: block;
          width: 0;
          height: 8px;
          background-color: white;
          border-radius: 4px;
          transition: width 0.2s ease;
          @media (prefers-color-scheme: light) {
            background-color: black;
          }
        }
      }

      &--mining {
        .sml-graph-viewer__node-process {
          display: block;
          @media (prefers-color-scheme: light) {
            filter: invert(1);
          }
        }

        .sml-graph-viewer__node-pow-lottery,
        .sml-graph-viewer__node-progress-bar
        {
          display: block;
        }
      }

      &--selected {
        box-shadow: 0 0 12px var(--shadow-color);
      }
    }

    @keyframes tx-fadeout {
      60% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  }
</style>
