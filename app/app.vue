<script setup lang="ts">
/**
 * App.vue - Root application component
 * 
 * SimLedger main entry point that initializes and renders the blockchain simulator.
 * 
 * Architecture:
 * - Wraps Dashboard component which manages GraphViewer, NodeExplorer, NodeEditor
 * - Uses useSceneSetup composable for declarative scene initialization
 * - Scene configurations defined in app/config/scenes.ts
 */

import type { SystemNode } from '~~/src/network/system_node';
import Dashboard from './components/dashboard.vue';
import { defaultScene } from '~/config/scenes';

const dashboard = ref();
const nodes = ref<{ systemNode: SystemNode; element?: HTMLDivElement | null; graphRef?: any }[]>([]);
const { initializeScene } = useSceneSetup();

async function onDashboardReady() {
  await initializeScene(defaultScene, dashboard.value);
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
