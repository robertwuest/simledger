<!--
  AddressLabel Component

  Human readable wallet address: node name with its color, genesis wallet,
  mining reward or a shortened external address.
-->
<template>
  <span class="inline-flex min-w-0 items-center gap-1.5" :data-kind="info.kind" data-testid="address-label" :title="address">
    <NodeDot v-if="info.kind === 'node'" :node-id="info.label" />
    <UIcon v-else :name="icon" class="size-3.5 shrink-0" :class="iconClass" />
    <span class="truncate" :class="{ 'font-mono text-xs': info.kind === 'external' }">{{ text }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import NodeDot from './NodeDot.vue';
import { useNetwork } from '~/composables/useNetwork';
import { describeAddress } from '~/utils/address';

const props = defineProps<{
  address: string;
}>();

const network = useNetwork();

const info = computed(() => {
  const nodes = network.nodes.value;
  return describeAddress(props.address, nodes, nodes[0]?.blockchain.genesisAddress);
});

const text = computed(() => {
  switch (info.value.kind) {
    case 'reward': return 'Mining reward';
    case 'genesis': return 'Genesis';
    default: return info.value.label;
  }
});

const icon = computed(() => {
  switch (info.value.kind) {
    case 'reward': return 'i-lucide-zap';
    case 'genesis': return 'i-lucide-sparkles';
    default: return 'i-lucide-wallet';
  }
});

const iconClass = computed(() => {
  switch (info.value.kind) {
    case 'reward': return 'text-warning';
    case 'genesis': return 'text-secondary';
    default: return 'text-muted';
  }
});
</script>
