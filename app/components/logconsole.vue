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
  
  @prop nodes - Array of network nodes with SystemNode instances to monitor
-->
<template>
  <div class="sml-console">
    <button type="button" class="sml-console__action" @click="clearLogs">Clear</button>
    <div ref="scrollArea" class="sml-console__body">
      <div v-if="entries.length === 0" class="sml-console__empty">No log entries yet.</div>
      <div v-else class="sml-console__list">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="sml-console__row"
          :data-type="entry.type"
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

const props = defineProps<{
  nodes: {
    systemNode: SystemNode,
  }[],
}>();

const entries = ref<LogEntry[]>([]);
const scrollArea = ref<HTMLDivElement>();
const subscriptions = new Map<string, { unsubscribe: () => void }>();
let counter = 0;

/**
 * Subscribe to a node's event emitter and add its messages to the log
 * @param node - Node object containing a SystemNode instance
 */
function bindNode(node: { systemNode: SystemNode }) {
  const nodeId = node.systemNode.id;
  if (subscriptions.has(nodeId)) {
    return;
  }
  const sub = node.systemNode.eventEmitter.subscribe((event: any) => {
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
 * Remove subscriptions for nodes that are no longer in the props
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
  if (entries.value.length > 400) {
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
  props.nodes.forEach(bindNode);
  const ids = new Set(props.nodes.map(n => n.systemNode.id));
  unbindMissing(ids);
}

watch(() => props.nodes.map(n => n.systemNode.id).join(','), () => {
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
  gap: 6px;
  height: calc(100% - 28px);
  position: relative;
}

/* Clear button in toolbar */
.sml-console__action {
  border: 1px solid var(--ui-bg-muted);
  background: var(--ui-bg-accented);
  color: var(--ui-text-primary);
  padding: 0px 8px;
  cursor: pointer;
  transition: background 0.15s ease;
  position: absolute;
  right: 2px;
  top: -27px;
}

.sml-console__action:hover {
  background: var(--ui-bg-elevated);
}

/* Scrollable log container */
.sml-console__body {
  flex: 1;
  border: 1px solid var(--ui-bg-muted);
  background: var(--ui-bg-default);
  overflow-y: auto;
  padding: 6px 4px;
}

/* Empty state message */
.sml-console__empty {
  color: var(--ui-text-secondary);
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
  background: rgba(255, 255, 255, 0.02);
  font-family: var(--ui-font-mono, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace);
  font-size: 0.85rem;
  color: var(--ui-text-primary);
}

/* Warning severity styling (yellow) */
.sml-console__row[data-type="warn"] {
  border-left: 4px solid #e0a800;
  background: rgba(224, 168, 0, 0.08);
}

/* Error severity styling (red) */
.sml-console__row[data-type="error"] {
  border-left: 4px solid #c53030;
  background: rgba(197, 48, 48, 0.1);
}

/* Info/log severity styling (blue) */
.sml-console__row[data-type="log"] {
  border-left: 4px solid #4aa3ff;
  background: rgba(74, 163, 255, 0.06);
}

/* Timestamp column */
.sml-console__time {
  color: var(--ui-text-secondary);
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
