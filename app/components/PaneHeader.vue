<!--
  PaneHeader Component

  Title bar of a dashboard pane with an optional actions slot.
-->
<template>
  <div class="sml-pane-header">
    <h2 class="sml-pane-header__title">{{ title }}</h2>
    <div class="sml-pane-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style>
.sml-pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  padding: 0 6px;
  background: var(--ui-bg-elevated);
  border-bottom: 1px solid var(--ui-border);
}
.sml-pane-header__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: bold;
}
.sml-pane-header__actions {
  display: flex;
  gap: 4px;
}
</style>
