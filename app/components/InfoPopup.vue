<template>
    <UModal v-model:open="open">
        <UButton variant="ghost" size="sm" icon="i-lucide-info" class="-mr-1" />
        <template #content>
            <div class="sml-info-popup">
              <UButton variant="ghost" size="sm" icon="i-lucide-x" class="-mr-1 absolute top-2 right-2" @click="() => { open = false }" />
            <div class="sml-info-popup__header p-4">
                <img :src="asset('img/logo.png')" alt="SimLedger Logo">
            </div>
            <p class="sml-info-popup__version">
                <strong>Version:</strong> {{ appVersion }}
            </p>

            <section class="sml-info-popup__section">
                <h3>Overview</h3>
                <p>SimLedger is an educational blockchain simulator that allows users to:</p>
                <ul>
                    <li>Create and manage network nodes representing blockchain participants</li>
                    <li>Visualize network topology and data flow in real-time</li>
                    <li>Simulate cryptocurrency transactions across the network</li>
                    <li>Monitor blockchain state and transaction history</li>
                    <li>Interact with the network through an intuitive UI</li>
                </ul>
            </section>

            <section class="sml-info-popup__section">
                <h3>Key Features</h3>
                <ul>
                    <li><strong>Proof-of-Work:</strong> Consensus mechanism with SHA256-based block hashing</li>
                    <li><strong>Transaction Validation:</strong> Elliptic curve signatures and mining rewards</li>
                    <li><strong>Network Simulation:</strong> Multi-node topology with real-time broadcasting</li>
                    <li><strong>Forks &amp; Consensus:</strong> Longest-chain rule with console feedback; retain or adopt a peer's chain in a conflict</li>
                    <li><strong>Interactive Visualization:</strong> Animated transaction flow and node inspection</li>
                </ul>
            </section>

            <section class="sml-info-popup__section">
                <h3>Project Links</h3>
                <ul>
                    <li>
                        <ULink to="https://github.com/robertwuest/simledger" target="_blank">Github</ULink>
                    </li>
                </ul>
            </section>
        </div>
        </template>
    </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAppVersion } from '~~/app/plugins/version';
import { useAssetUrl } from '~/composables/useAssetUrl';

const asset = useAssetUrl();

const open = ref(false)
const appVersion = useAppVersion();

defineShortcuts({
    o: () => open.value = !open.value
})
</script>

<style scoped>
.sml-info-popup {
    padding: 20px;
}

.sml-info-popup__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--ui-bg-accented);
    padding-bottom: 10px;
}

.sml-info-popup__close-button {
    position: absolute;
    top: 10px;
    right: 10px;
}

.sml-info-popup__header h2 {
    margin: 0;
    font-size: 1.5rem;
}

.sml-info-popup__content {
    color: var(--text-color);
    line-height: 1.6;
}

.sml-info-popup__close-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--text-color-highlighted);
}

.sml-info-popup__version {
    background-color: var(--ui-bg-muted);
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 20px;
    font-size: 0.9rem;
}

.sml-info-popup__section {
    margin-bottom: 20px;
}

.sml-info-popup__section h3 {
    margin: 15px 0 10px 0;
    font-size: 1.1rem;
    color: var(--text-color-highlighted);
}

.sml-info-popup__section li {
    margin: 5px 15px;
    display: list-item;
    list-style: disc;
}
</style>
