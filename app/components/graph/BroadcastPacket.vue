<!--
  BroadcastPacket Component

  A transaction or block travelling along a network edge. Every animation frame the
  position is sampled from the live edge path, so packets keep following an edge while
  nodes are dragged or the viewport is zoomed. Honors prefers-reduced-motion by showing
  the packet at its destination instead of moving it.

  Props:
  - packet: Packet description from the broadcast animation store
  - path: Getter returning the SVG path element of the edge
  - reverse: Travel from the path end to its start
-->
<template>
  <div
    class="sml-packet nodrag nopan"
    :class="`sml-packet--${packet.kind}`"
    :style="style"
    :data-testid="`packet-${packet.kind}`"
    :data-from="packet.fromId"
    :data-to="packet.toId"
    :data-x="position ? Math.round(position.x) : undefined"
    :data-y="position ? Math.round(position.y) : undefined"
  >
    <img v-if="packet.kind === 'block'" :src="asset('img/icons/block.svg')" alt="Block">
    <template v-else>
      <UIcon name="i-lucide-arrow-right-left" class="sml-packet__icon" />Tx
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Packet } from '~/composables/useBroadcastAnimations';
import { useNetwork } from '~/composables/useNetwork';
import { useAssetUrl } from '~/composables/useAssetUrl';
import { easeInOutQuad, packetOpacity, pointOnPath, progressAt, type PathLike } from '~/utils/graph/motion';

const props = defineProps<{
  packet: Packet;
  path: () => PathLike | null | undefined;
  reverse?: boolean;
}>();

const { animations } = useNetwork();
const asset = useAssetUrl();

const position = ref<{ x: number; y: number } | null>(null);
const opacity = ref(1);
let frame: number | null = null;

const style = computed(() => ({
  transform: position.value
    ? `translate(-50%, -50%) translate(${position.value.x}px, ${position.value.y}px)`
    : undefined,
  visibility: position.value ? 'visible' as const : 'hidden' as const,
  opacity: opacity.value,
}));

/** Update position and opacity for the current time */
function update() {
  const linear = progressAt(animations.now(), props.packet);
  const eased = animations.reducedMotion() ? 1 : easeInOutQuad(linear);
  const path = props.path();
  if (path && typeof path.getTotalLength === 'function') {
    position.value = pointOnPath(path, eased, props.reverse);
  }
  opacity.value = packetOpacity(linear);
  return linear;
}

function step() {
  frame = null;
  if (update() < 1) {
    frame = requestAnimationFrame(step);
  }
}

onMounted(step);

onBeforeUnmount(() => {
  if (frame !== null) {
    cancelAnimationFrame(frame);
  }
});

defineExpose({ update });
</script>

<style>
.sml-packet {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  border: 1px solid var(--ui-border-accented);
  border-radius: 5px;
  font-size: 12px;
  line-height: 1;
  color: var(--ui-text-highlighted);
  pointer-events: none;
  will-change: transform, opacity;
}
.sml-packet--tx {
  background: rgba(0, 255, 255, 0.6);
}
.sml-packet--block {
  background: rgba(255, 0, 255, 0.6);
}
.sml-packet--block img {
  width: 25px;
  height: 25px;
}
.sml-packet__icon {
  width: 12px;
  height: 12px;
}
</style>
