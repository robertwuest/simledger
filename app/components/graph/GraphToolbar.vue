<!--
  GraphToolbar Component

  Floating toolbar on the graph canvas.

  Props:
  - running: Whether the simulation clock is running

  Events:
  - add-node: Add a new node to the network
  - layout: Re-run the automatic layout
  - fit: Fit all nodes into the viewport
  - toggle-simulation: Pause / resume the simulation
-->
<template>
  <div class="sml-graph-toolbar nodrag nopan" role="toolbar" aria-label="Graph tools">
    <UTooltip text="Add node">
      <UButton size="sm" variant="ghost" color="neutral" icon="i-lucide-circle-plus" aria-label="Add node" data-testid="toolbar-add-node" @click="emit('add-node')" />
    </UTooltip>
    <UTooltip text="Auto layout">
      <UButton size="sm" variant="ghost" color="neutral" icon="i-lucide-network" aria-label="Auto layout" data-testid="toolbar-layout" @click="emit('layout')" />
    </UTooltip>
    <UTooltip text="Fit view">
      <UButton size="sm" variant="ghost" color="neutral" icon="i-lucide-maximize" aria-label="Fit view" data-testid="toolbar-fit" @click="emit('fit')" />
    </UTooltip>
    <UTooltip :text="running ? 'Pause simulation' : 'Resume simulation'">
      <UButton
        size="sm"
        variant="ghost"
        :color="running ? 'neutral' : 'warning'"
        :icon="running ? 'i-lucide-pause' : 'i-lucide-play'"
        :aria-label="running ? 'Pause simulation' : 'Resume simulation'"
        :aria-pressed="!running"
        data-testid="toolbar-simulation"
        @click="emit('toggle-simulation')"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  running: boolean;
}>();

const emit = defineEmits<{
  'add-node': [];
  layout: [];
  fit: [];
  'toggle-simulation': [];
}>();
</script>

<style>
.sml-graph-toolbar {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: var(--ui-bg-elevated);
}
</style>
