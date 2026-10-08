<script setup lang="ts">
/**
 * App.vue - Root application component
 *
 * SimLedger main entry point that initializes and renders the blockchain simulator.
 *
 * Architecture:
 * - Provides the network store shared by all dashboard panes
 * - Uses useSceneSetup composable for declarative scene initialization
 * - Scene configurations defined in app/config/scenes.ts
 */

import { onBeforeUnmount, onMounted } from 'vue';
import Dashboard from './components/Dashboard.vue';
import InfoPopup from './components/InfoPopup.vue';
import { defaultScene } from '~/config/scenes';
import { provideNetwork } from '~/composables/useNetwork';
import { useSceneSetup } from '~/composables/useSceneSetup';
import { useAssetUrl } from '~/composables/useAssetUrl';

const network = provideNetwork();
const { initializeScene } = useSceneSetup();
const asset = useAssetUrl();
const colorMode = useColorMode();
let cancelScene = () => {};

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}

onMounted(() => {
  network.start();
  cancelScene = initializeScene(defaultScene, network);
});

onBeforeUnmount(() => {
  cancelScene();
  network.dispose();
});
</script>

<style>
@import '~~/assets/css/main.css';
#__nuxt {
  display: flex;
  flex-direction: column;
  height: 100vh;
  text-align: center;
  background-color: var(--ui-bg-muted);
}

.sml-app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  background-color: var(--ui-bg-elevated);
  border-bottom: 1px solid var(--ui-bg-accented);
}

.sml-app-header__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>

<template>
  <UApp>
    <header class="sml-app-header">
      <img :src="asset('img/logo132.png')" alt="SimLedger Logo">
      <div class="sml-app-header__actions">
        <ClientOnly>
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            data-testid="color-mode-toggle"
            @click="toggleColorMode"
          />
        </ClientOnly>
        <InfoPopup />
      </div>
    </header>
    <Dashboard />
  </UApp>
</template>
