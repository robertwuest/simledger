<!--
  LogConsole Component
  
  A real-time log viewer component for displaying blockchain network events.
  Subscribes to SystemNode event emitters and displays log messages with
  timestamps and severity levels (log, warn, error).
  
  Features:
  - Auto-scrolling to latest entries
  - Severity-based color coding
  - Clear button to reset logs
  - Maximum 400 entries with FIFO eviction
  - Automatic cleanup of subscriptions on unmount

  Nodes are taken from the network store.
-->
<template>
  <div class="sml-console">
    <PaneHeader title="Console">
      <template #actions>
        <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-eraser" data-testid="console-clear" @click="clearLogs">Clear</UButton>
      </template>
    </PaneHeader>
    <div ref="scrollArea" class="sml-console__body">
      <div v-if="entries.length === 0" class="sml-console__empty">No log entries yet.</div>
      <div v-else class="sml-console__list">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="sml-console__row"
          :data-type="entry.type"
          data-testid="console-entry"
        >
          <span class="sml-console__time">{{ formatTime(entry.timestamp) }}</span>
          <span class="sml-console__node">{{ entry.nodeId }}</span>
          <span class="sml-console__message">{{ entry.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * LogConsole Component Setup Script
 * 
 * Manages:
 * - Event subscriptions to SystemNode instances
 * - Log entry storage and display
 * - Auto-scrolling behavior
 * - Auto-cleanup on component unmount
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { SystemNode } from '~~/src/network/system_node';
import PaneHeader from './PaneHeader.vue';
import { useNetwork } from '~/composables/useNetwork';

/**
 * Log entry type definition
 * @param id - Unique identifier (auto-incremented)
 * @param nodeId - Source node identifier
 * @param type - Severity level: 'log' (info), 'warn', or 'error'
 * @param message - Sanitized log message
 * @param timestamp - Unix timestamp of the log entry
 */
type LogEntry = {
  id: number;
  nodeId: string;
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
};

const MAX_ENTRIES = 400;

const network = useNetwork();

const entries = ref<LogEntry[]>([]);
const scrollArea = ref<HTMLDivElement>();
const subscriptions = new Map<string, { unsubscribe: () => void }>();
let counter = 0;

/**
 * Subscribe to a node's event emitter and add its messages to the log
 * @param node - SystemNode instance
 */
function bindNode(node: SystemNode) {
  const nodeId = node.id;
  if (subscriptions.has(nodeId)) {
    return;
  }
  const sub = node.eventEmitter.subscribe((event: any) => {
    if (event?.msg === SystemNode.events.MESSAGE) {
      pushEntry({
        nodeId,
        type: (event.payload?.type as LogEntry['type']) ?? 'log',
        message: sanitize(event.payload?.message ?? ''),
      });
    }
  });
  subscriptions.set(nodeId, sub);
}

/**
 * Remove subscriptions for nodes that are no longer in the network
 * @param currentIds - Set of currently active node IDs
 */
function unbindMissing(currentIds: Set<string>) {
  subscriptions.forEach((sub, id) => {
    if (!currentIds.has(id)) {
      sub.unsubscribe?.();
      subscriptions.delete(id);
    }
  });
}

/**
 * Add a new log entry and auto-scroll to the bottom
 * Maintains a maximum of 400 entries, removing oldest entries when exceeded
 * @param entry - Log entry data (id and timestamp will be auto-assigned)
 */
function pushEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
  entries.value.push({ ...entry, id: ++counter, timestamp: Date.now() });
  if (entries.value.length > MAX_ENTRIES) {
    entries.value.shift();
  }
  nextTick(() => {
    const el = scrollArea.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

/**
 * Remove CSS formatting codes from messages (e.g., %c used for console styling)
 * @param message - Raw log message
 * @returns Sanitized message
 */
function sanitize(message: string) {
  return message.replace(/^%c/, '').trim();
}

/**
 * Sync subscriptions to match the current list of nodes
 * Binds new nodes and unbinds removed nodes
 */
function syncSubscriptions() {
  network.nodes.value.forEach(bindNode);
  const ids = new Set(network.nodeIds.value);
  unbindMissing(ids);
}

watch(() => network.nodeIds.value.join(','), () => {
  syncSubscriptions();
}, { immediate: true });

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour12: false });
}

/**
 * Clear all log entries from the display
 */
function clearLogs() {
  entries.value = [];
}

/**
 * Cleanup: Unsubscribe from all node event emitters on unmount
 */
onBeforeUnmount(() => {
  subscriptions.forEach(sub => sub.unsubscribe?.());
  subscriptions.clear();
});
</script>

<style scoped>
/**
 * LogConsole Styles
 * 
 * Layout:
 * - Toolbar: title and clear button
 * - Body: scrollable log entry list
 * 
 * Color coding:
 * - Blue: info/log entries
 * - Yellow: warnings
 * - Red: errors
 */

/* Main container */
.sml-console {
    display: flex;
    flex-direction: column;
    position: absolute;
    inset: 0;
}

/* Scrollable log container */
.sml-console__body {
  flex: 1;
  background: var(--ui-bg);
  overflow-y: auto;
  padding: 6px 4px;
}

/* Empty state message */
.sml-console__empty {
  color: var(--ui-text-muted);
  font-size: 0.9rem;
  padding: 4px 6px;
}

/* Log entries list container */
.sml-console__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Individual log entry row */
.sml-console__row {
  display: grid;
  grid-template-columns: 82px 90px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--ui-bg-elevated);
  font-family: var(--ui-font-mono, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace);
  font-size: 0.85rem;
  color: var(--ui-text);
}

/* Warning severity styling (yellow) */
.sml-console__row[data-type="warn"] {
  border-left: 4px solid var(--ui-warning);
  background: color-mix(in oklch, var(--ui-warning) 12%, var(--ui-bg));
}

/* Error severity styling (red) */
.sml-console__row[data-type="error"] {
  border-left: 4px solid var(--ui-error);
  background: color-mix(in oklch, var(--ui-error) 12%, var(--ui-bg));
}

/* Info/log severity styling (blue) */
.sml-console__row[data-type="log"] {
  border-left: 4px solid var(--ui-info);
  background: color-mix(in oklch, var(--ui-info) 8%, var(--ui-bg));
}

/* Timestamp column */
.sml-console__time {
  color: var(--ui-text-muted);
}

/* Node ID column */
.sml-console__node {
  font-weight: bold;
}

/* Message column with word wrapping */
.sml-console__message {
  word-break: break-word;
  text-align: left;
}
</style>
