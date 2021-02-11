<template>
  <div class="sml-graph-viewer">
    <div class="sml-graph-viewer__nodes">
      <div id="canvas" class="canvas">
      </div>
      <div v-bind:class="{ 'sml-graph-viewer__node--mining' : node.systemNode.isMining === true, 'sml-graph-viewer__node--selected': node.systemNode.id === selectedNodeId }" class="sml-graph-viewer__node" v-for="node in nodes" :key="node.systemNode.id" :id="node.systemNode.id" >
        <h3>{{ node.systemNode.id }}</h3>
        <div>Balance: {{ node.systemNode.getBalance() }}</div>
        <img class="sml-graph-viewer__node-process" src="../assets/icons/gears.svg" alt="" fill="#FF0000"/>
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

  mounted() {
    window.addEventListener('shapeDragMove', (event: any) => {
      if (this.nodes) {
        // eslint-disable-next-line
        const item = this.nodes.find((node: any) => {
          // eslint-disable-next-line
          return node.graphRef.shape.items.find((shapeItem:any) => shapeItem.id === event.detail.item.id);
        });
        if (item && item.element) {
          item.element.style.transform = `translate(${event.detail.x + window.scrollX}px, ${event.detail.y + window.scrollY}px)`;
        }
      }
    });

    this.visualGraph = new Dracula.Graph();

    // refresh
    setTimeout(() => {
      // eslint-disable-next-line
      const layout = new Dracula.Layout.Spring(this.visualGraph);
      const renderer = new Dracula.Renderer.Raphael('#canvas', this.visualGraph, 1024, 500);
      renderer.draw();
      this.nodes.forEach((node: any) => {
        if (!node.element) {
          node.element = document.querySelector(`#${node.systemNode.id}`);
          const shapeBounds = node.graphRef.shape.items[0].node.getBoundingClientRect();
          node.element.style.transform = `translate(${shapeBounds.x + window.scrollX}px, ${shapeBounds.y + window.scrollY}px)`;
        }
      });
    }, 1);
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
    console.log(content);
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

      .canvas {
        height: 75vh;
        width: 100%;
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

      &--mining {
        .sml-graph-viewer__node-process {
          display: block;
          @media (prefers-color-scheme: light) {
            filter: invert(1);
          }
        }
      }

      &--selected {
        box-shadow: 0 0 12px var(--shadow-color);
      }
    }

    @keyframes pulse-animation {
      0% {
        box-shadow: 0 0 0 0px rgba(255, 0, 0, 0.4);
      }
      100% {
        box-shadow: 0 0 0 20px rgba(255, 0, 0, 0);
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
