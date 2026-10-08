<!--
  NetworkNode Component

  Custom Vue Flow node rendering a blockchain network participant:
  - Name and live wallet balance
  - Mining state (spinning gears, PoW lottery die, progress bar)
  - Error flash when the node logs a warning
  - Fork icon while the node's chain conflicts with a connected peer
  - Connection menu to connect / disconnect peers

  The SystemNode itself is looked up in the network store by the node id.
-->
<template>
  <div
    v-if="view"
    class="sml-node"
    :class="{
      'sml-node--mining': view.isMining,
      'sml-node--conflict': view.openConflicts > 0,
      'sml-node--selected': selected,
      'sml-node--error': flashing,
    }"
    data-testid="network-node"
    :data-node-id="id"
    :aria-label="ariaLabel"
    :style="{ '--sml-node-color': color }"
  >
    <Handle type="target" :position="Position.Top" class="sml-node__handle" />
    <div class="sml-node__header">
      <h3 class="sml-node__title">{{ id }}</h3>
      <UIcon
        v-if="view.openConflicts"
        name="i-lucide-git-fork"
        class="sml-node__conflict"
        :title="conflictTitle"
        data-testid="node-conflict"
      />
      <UIcon v-if="view.isMining" name="i-lucide-cog" class="sml-node__process" data-testid="node-mining-icon" />
      <ConnectionMenu v-else :node-id="id" :disabled="view.isMining" />
    </div>
    <div class="sml-node__balance" data-testid="node-balance">Balance: {{ view.balance }}</div>
    <div class="sml-node__progress" data-testid="node-progress">
      <span :style="{ width: view.isMining ? '100%' : '0', transitionDuration: `${(view.miningDelay + 1) * 2}s` }" />
    </div>
    <img
      v-if="view.isMining"
      class="sml-node__lottery"
      :src="asset(`img/icons/die${view.miningDelay + 1}.svg`)"
      :alt="`Mining lottery roll ${view.miningDelay + 1}`"
      data-testid="node-lottery"
    >
    <UIcon v-if="flashing" name="i-lucide-triangle-alert" class="sml-node__error" data-testid="node-error" />
    <Handle type="source" :position="Position.Bottom" class="sml-node__handle sml-node__handle--source" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position } from '@vue-flow/core';
import ConnectionMenu from './ConnectionMenu.vue';
import { useNetwork } from '~/composables/useNetwork';
import { useAssetUrl } from '~/composables/useAssetUrl';
import { nodeColor } from '~/utils/graph/colors';

const props = defineProps<{
  id: string;
}>();

const network = useNetwork();
const asset = useAssetUrl();

const view = computed(() => network.getNodeView(props.id));
const selected = computed(() => network.selectedNodeId.value === props.id);
const color = computed(() => nodeColor(network.nodeIds.value.indexOf(props.id)));
const flashing = computed(() => network.flashing.value.includes(props.id));
const conflictTitle = computed(() => {
  const count = view.value?.openConflicts ?? 0;
  return `Chain conflict with ${count === 1 ? 'a peer' : `${count} peers`}, resolve it in the explorer`;
});
const ariaLabel = computed(() => {
  if (!view.value) return props.id;
  return `${props.id}, balance ${view.value.balance}${view.value.isMining ? ', mining' : ''}${view.value.openConflicts ? ', chain conflict' : ''}`;
});
</script>

<style>
.sml-node {
  position: relative;
  width: 150px;
  height: 80px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 3px solid var(--sml-node-color, var(--ui-primary));
  background: var(--ui-bg-elevated);
  color: var(--ui-text);
  text-align: left;
  transition: box-shadow 0.2s ease;
}
.sml-node--selected {
  box-shadow: 0 0 0 2px var(--ui-bg), 0 0 14px 2px var(--ui-primary);
}
.sml-node--error {
  animation: sml-node-flash 2s;
}
.sml-node__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.sml-node__title {
  margin: 0;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sml-node__conflict {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-right: auto;
  color: var(--ui-warning);
}
.sml-node--conflict {
  border-style: dashed;
}
.sml-node__balance {
  font-size: 0.875rem;
}
.sml-node__process {
  width: 22px;
  height: 22px;
  animation: sml-node-spin 2s linear infinite;
}
.sml-node__lottery {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 25px;
  height: 25px;
}
.sml-node__progress {
  visibility: hidden;
  width: 65%;
  margin-top: 3px;
  padding: 1px;
  border: 1px solid var(--ui-text);
  border-radius: 6px;
}
.sml-node--mining .sml-node__progress {
  visibility: visible;
}
.sml-node__progress span {
  display: block;
  width: 0;
  height: 8px;
  border-radius: 4px;
  background-color: var(--ui-text);
  transition-property: width;
  transition-timing-function: linear;
}
.sml-node__error {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 36px;
  height: 36px;
  color: var(--ui-error);
  pointer-events: none;
  transform: translate(-50%, -50%);
  animation: sml-node-error 2s forwards;
}
.sml-node .sml-node__handle {
  width: 10px;
  height: 10px;
  border: 2px solid var(--ui-bg);
  background: var(--ui-border-accented);
  opacity: 0;
  transition: opacity 0.15s ease;
}
.sml-node:hover .sml-node__handle,
.vue-flow__node.connecting .sml-node__handle {
  opacity: 1;
}
.sml-node .sml-node__handle--source {
  background: var(--ui-primary);
}
@keyframes sml-node-spin {
  to { transform: rotate(360deg); }
}
@keyframes sml-node-error {
  0% { opacity: 0; }
  40% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes sml-node-flash {
  0%, 100% { border-color: var(--sml-node-color, var(--ui-primary)); }
  40% { border-color: var(--ui-error); }
}
@media (prefers-reduced-motion: reduce) {
  .sml-node__process, .sml-node--error { animation: none; }
}
</style>
