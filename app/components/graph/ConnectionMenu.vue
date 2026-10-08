<!--
  ConnectionMenu Component

  Dropdown on a network node listing all other nodes with their connection state.
  Selecting an entry connects / disconnects the two nodes (bidirectional).

  Props:
  - nodeId: Node the menu belongs to
  - disabled: Disable the menu (e.g. while the node is mining)
-->
<template>
  <UDropdownMenu :items="items" :content="{ align: 'end', side: 'top' }" :disabled="disabled">
    <UButton
      class="nodrag nopan"
      size="xs"
      variant="ghost"
      color="neutral"
      icon="i-lucide-cable"
      :disabled="disabled"
      :aria-label="`Manage connections of ${nodeId}`"
      data-testid="connection-menu-trigger"
      @click.stop
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DropdownMenuItem } from '@nuxt/ui';
import { useNetwork } from '~/composables/useNetwork';

const props = defineProps<{
  nodeId: string;
  disabled?: boolean;
}>();

const network = useNetwork();

const items = computed<DropdownMenuItem[][]>(() => [
  [{ label: 'Connections', type: 'label' }],
  network.nodeIds.value
    .filter(id => id !== props.nodeId)
    .map((peer) => {
      const connected = network.isConnected(props.nodeId, peer);
      return {
        label: peer,
        type: 'checkbox',
        icon: connected ? 'i-lucide-link' : 'i-lucide-unlink',
        checked: connected,
        'data-testid': `connection-item-${peer}`,
        onUpdateChecked: () => network.toggleConnection(props.nodeId, peer),
        onSelect: (event: Event) => event.preventDefault(),
      } satisfies DropdownMenuItem;
    }),
]);
</script>
