<!--
  NetworkEdge Component

  Custom Vue Flow edge for a (bidirectional) peer connection. The edge floats: it
  attaches to the border of both node cards at the point facing the other node.
  Packets broadcast along this connection are rendered on top of the edge.
  The edge is dashed in the warning color while the two nodes have diverging chains.
-->
<template>
  <BaseEdge
    :id="id"
    :path="path[0]"
    :style="style"
    :interaction-width="20"
    class="sml-edge"
    :class="{ 'sml-edge--conflict': conflict }"
  />
  <path ref="pathEl" :d="path[0]" fill="none" stroke="none" class="sml-edge__track" />
  <EdgeLabelRenderer>
    <BroadcastPacket
      v-for="packet in packets"
      :key="packet.id"
      :packet="packet"
      :path="getPath"
      :reverse="packet.fromId !== source"
    />
  </EdgeLabelRenderer>
</template>

<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position, type GraphNode } from '@vue-flow/core';
import BroadcastPacket from './BroadcastPacket.vue';
import { useNetwork } from '~/composables/useNetwork';
import { getFloatingEdgeParams, type Rect } from '~/utils/graph/floating-edge';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  id: string;
  source: string;
  target: string;
  sourceNode: GraphNode;
  targetNode: GraphNode;
  selected?: boolean;
  style?: CSSProperties;
}>();

const { animations, conflictEdgeIds } = useNetwork();
const pathEl = ref<SVGPathElement | null>(null);

function toRect(node: GraphNode): Rect {
  return {
    x: node.computedPosition.x,
    y: node.computedPosition.y,
    width: node.dimensions.width,
    height: node.dimensions.height,
  };
}

const path = computed(() => {
  const params = getFloatingEdgeParams(toRect(props.sourceNode), toRect(props.targetNode));
  return getBezierPath({
    sourceX: params.sx,
    sourceY: params.sy,
    sourcePosition: params.sourceSide as Position,
    targetX: params.tx,
    targetY: params.ty,
    targetPosition: params.targetSide as Position,
  });
});

const conflict = computed(() => conflictEdgeIds.value.has(props.id));

const packets = computed(() => animations.packetsFor(props.id));

function getPath() {
  return pathEl.value;
}
</script>

<style>
.vue-flow__edge .vue-flow__edge-path.sml-edge--conflict {
  stroke: var(--ui-warning);
  stroke-dasharray: 6 4;
}
.vue-flow__edge.selected .sml-edge {
  stroke: var(--ui-primary) !important;
}
</style>
