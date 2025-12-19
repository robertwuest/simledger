<script setup lang="ts">
/**
 * App.vue - Root application component
 * 
 * SimLedger main entry point that:
 * 1. Initializes the blockchain simulation with 5 demo nodes (Bob, Alice, Frank, Grace, Dave)
 * 2. Creates a peer-to-peer network topology connecting the nodes
 * 3. Seeds the genesis account with initial balance (100 coins to Bob)
 * 4. Renders the Dashboard component for interactive visualization and testing
 * 
 * Architecture:
 * - Wraps Dashboard component which manages GraphViewer, NodeExplorer, NodeEditor
 * - Demonstrates cryptocurrency transfer from hardcoded genesis account
 * - Network forms a connected topology: Bob-Alice-Frank-Grace, Alice-Grace (cross-link)
 */

import type { SystemNode } from '~~/src/network/system_node';
import Dashboard from './components/dashboard.vue';
import SmlCommon from '~~/src/common';

const dashboard = ref();
const nodes = ref<{ systemNode: SystemNode; element?: HTMLDivElement | null; graphRef?: any }[]>([]);

function onDashboardReady() {
  const bobNode = dashboard.value?.addNode('Bob');
  const aliceNode = dashboard.value?.addNode('Alice');
  const frankNode = dashboard.value?.addNode('Frank');
  const graceNode = dashboard.value?.addNode('Grace');
  const daveNode = dashboard.value?.addNode('Dave');

  dashboard.value?.connectNodes(bobNode, aliceNode);
  dashboard.value?.connectNodes(aliceNode, frankNode);
  dashboard.value?.connectNodes(frankNode, graceNode);
  dashboard.value?.connectNodes(aliceNode, graceNode);

  // Genesis account from private key -- (!) hardcoded private key
  const genesisAcc = SmlCommon.generateKeyPair('9QpiFVXv6HNP47u2ZYGQ5anz9GigfM4JxLbvyYCfd9W');
  setTimeout(() => {
  dashboard.value?.orderTransaction(
    SmlCommon.HexToBase58(genesisAcc.getPublic(true, 'hex')),
    bobNode.systemNode.address,
    100,
    genesisAcc,
    bobNode
  );
  }, 1000);
}
</script>

<style>
@import '~~/assets/css/main.css';
#__nuxt {

	 text-align: center;
   background-color: var(--ui-bg-muted);
   display: flex;
   height: 100vh;
}
 #nav {
	 padding: 30px;
}
 #nav a {
	 font-weight: bold;
	 color: var(--link-color);
}
 #nav a.router-link-exact-active {
	 color: var(--link-active-color);
}

</style>

<template>
  <UApp>
    <Dashboard ref="dashboard" :nodes="nodes" @dashboard-ready="onDashboardReady"/>
  </UApp>
</template>
