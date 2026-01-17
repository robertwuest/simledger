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
import InfoPopup from './components/infopopup.vue';
import { defaultScene } from '~/config/scenes';

const dashboard = ref();
const infoPopup = ref();
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
   flex-direction: column;
   height: 100vh;
}

.sml-app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background-color: var(--ui-bg-elevated);
  border-bottom: 1px solid var(--ui-bg-accented);
  gap: 10px;
}

.sml-app-header__spacer {
  flex-grow: 1;
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
    <div class="sml-app-header">
      <img src="/img/logo132.png" alt="SimLedger Logo" />
     <InfoPopup ref="infoPopup" />
    </div>
    <Dashboard ref="dashboard" :nodes="nodes" @dashboard-ready="onDashboardReady"/>
  </UApp>
</template>
