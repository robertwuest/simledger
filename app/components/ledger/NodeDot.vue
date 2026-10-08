<!--
  NodeDot Component

  Small color marker identifying a node; uses the same accent color as the node in the graph.
-->
<template>
  <span
    class="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-default"
    :style="{ backgroundColor: color }"
    aria-hidden="true"
    data-testid="node-dot"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNetwork } from '~/composables/useNetwork';
import { nodeColor } from '~/utils/graph/colors';

const props = defineProps<{
  nodeId: string;
}>();

const network = useNetwork();
const color = computed(() => nodeColor(network.nodeIds.value.indexOf(props.nodeId)));
</script>
