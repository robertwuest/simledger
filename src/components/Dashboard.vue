<template>
  <div class="sml-dashboard">
    <h1>Dashboard</h1>
    <div class="nodes">
      <div id="canvas" class="canvas">
      </div>
      <div v-bind:class="{ 'nodes__node--mining' : node.systemNode.isMining === true }" class="nodes__node" v-for="node in nodes" :key="node.systemNode.id" :id="node.systemNode.id" >
        <h3>{{ node.systemNode.id }}</h3>
        <div>Balance: {{ node.systemNode.getBalance() }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 */
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
import { SystemNode } from '../network/system_node';
import SmlCommon from '../common';
import Dracula from '../dracula';

import { System } from '../network/system';

gsap.registerPlugin(MotionPathPlugin);

// import { Blockchain } from '../blockchain/blockchain';
/* eslint-disable */
@Component
export default class Dashboard extends Vue {
  @Prop({ default: () => [] }) nodes!: {
    systemNode: SystemNode,
    element?: HTMLDivElement,
    graphRef?: any,
  }[];
  @Watch('nodes')
  updateNodes() {

  }
  visualGraph!: any;
  system!: System;

  created() {

  }

  mounted() {
    window.addEventListener('shapeDragMove', (event: any) => {
      if (this.nodes) {
        const item = this.nodes.find((node:any) => {
          return node.graphRef.shape.items.find((shapeItem:any) => shapeItem.id === event.detail.item.id);
        });
        if (item && item.element) {
          item.element.style.transform = `translate(${event.detail.x + window.scrollX}px, ${event.detail.y + window.scrollY}px)`;

        }
      }
    });
    this.visualGraph = new Dracula.Graph();

    // Genesis account from private key
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
    this.connectNodes(aliceNode, graceNode);

    const layout = new Dracula.Layout.Spring(this.visualGraph);
    const renderer = new Dracula.Renderer.Raphael('#canvas', this.visualGraph, 900, 500);

    // refresh
    setTimeout(() => {
      renderer.draw();
      this.nodes.forEach((node: any) => {
        if (!node.element) {
          node.element = document.querySelector(`#${node.systemNode.id}`);
          const shapeBounds = node.graphRef.shape.items[0].node.getBoundingClientRect();
          node.element.style.transform = `translate(${shapeBounds.x + window.scrollX}px, ${shapeBounds.y + window.scrollY}px)`;
        }
      });
    }, 1);

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
  }

  /**
   * Add a new node to the network
   * @param id
   */
  addNode(id: string): any {
    if (!this.nodes.find( item => item.systemNode.id === id)) {
      const node =  {systemNode: new SystemNode(id, this.system), graphRef: this.visualGraph.addNode(id)};
      node.systemNode.eventEmitter.subscribe({
          next: (event) => { this.onSystemNodeEvent(event, node); },
        }
      );
      this.nodes.push(node);
      return node;
    }
  }

  /**
   * Establish a virtual connection between to nodes of the network
   * @param nodeA
   * @param nodeB
   */
  connectNodes(nodeA: any, nodeB: any) {
    if (nodeA.systemNode.connectToNode(nodeB.systemNode)){
      this.visualGraph.addEdge(nodeA.systemNode.id, nodeB.systemNode.id);
    }
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
            this.animateBroadcast('TX', 'txdiv', sender.graphRef.id, edge);
          }
        }
        if (event.msg === SystemNode.events.BROADCAST_BLOCK) {
          if (sender.systemNode.id === event.referrer.id ||
            (edge.source.id !== event.referrer.id && edge.target.id !== event.referrer.id)) {
            this.animateBroadcast('BLOCK', 'blockdiv', sender.graphRef.id, edge);
          }
        }
      });
    }
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
      ease: "power1.inOut",
      motionPath:{
        path: edge.shape.fg.node,
        align: edge.shape.fg.node,
        alignOrigin: [0.5, 0.5]
      },
      onComplete: () => {
        element.remove();
      },
    };
    element.classList.add(cssClass);
    element.innerText = content;
    this.$el.appendChild(element);
    if (sourceId === edge.source.id) {
      gsap.to(element, gsapAnimationObject);
    } else {
      gsap.from(element, gsapAnimationObject);
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
      signingKey);
  }

  createGraph() {

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

  .txdiv,
  .blockdiv {
    position: absolute;
    padding: 2px;
    border-radius: 5px;
    line-height: 1;
    border: 1px solid grey;
    background: cyan;
    animation: tx-fadeout 2s;
  }

  .blockdiv {
    background: magenta;
  }

  .nodes {
    display: flex;
    .canvas {
      position: absolute;
      //z-index: -1;
      height: 75vh;
      width: 100%;
    }

    &__node {
      top: 0;
      left: 0;
      width: 150px;
      height: 80px;
      max-height: 80px;
      max-width: 150px;
      //border: 1px solid darkgrey;
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

      &--mining {
        animation: pulse-animation 1s infinite;
      }
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

</style>
