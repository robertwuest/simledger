<script setup lang="ts">

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
@import '~~/node_modules/splitpanes/dist/splitpanes.css';
#__nuxt {
	 font-family: Avenir, Helvetica, Arial, sans-serif;
	 -webkit-font-smoothing: antialiased;
	 -moz-osx-font-smoothing: grayscale;
	 text-align: center;
	 color: var(--text-color);
	 background: var(--background-color);
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
