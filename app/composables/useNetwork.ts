/**
 * Network store
 *
 * Single source of truth for the simulated network shown in the UI. It owns the
 * simulation `System`, the `SystemNode` instances, the current selection and
 * the transient UI state (error flashes, broadcast animations).
 *
 * The domain objects are kept raw (non-reactive) – they are mutated from RxJS
 * callbacks and timers outside Vue. Instead, a `version` counter is bumped on every
 * simulation tick, node event and store action; views read it to re-evaluate.
 */

import { computed, inject, markRaw, provide, ref, shallowRef, type InjectionKey } from 'vue';
import { System } from '~~/src/network/system';
import { SystemNode } from '~~/src/network/system_node';
import { edgeId, resolveBroadcastTargets } from '~/utils/graph/broadcast';
import { createBroadcastAnimations, type BroadcastAnimations, type PacketKind } from './useBroadcastAnimations';

export interface NodeView {
  id: string;
  address: string;
  balance: number;
  isMining: boolean;
  miningDelay: number;
  connectedIds: string[];
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
}

export interface NetworkStoreOptions {
  system?: System;
  animations?: BroadcastAnimations;
  /** Duration of the error flash on a node in ms */
  flashDuration?: number;
}

interface SystemNodeEvent {
  msg: string;
  referrer?: SystemNode;
  payload?: { type?: string; message?: string };
}

const SPARE_NAMES = ['Carol', 'Erin', 'Heidi', 'Ivan', 'Judy', 'Mallory', 'Niaj', 'Oscar', 'Peggy', 'Rupert', 'Sybil', 'Trent', 'Victor', 'Walter'];

/**
 * Create a network store
 * @param options - Optional system / animation store overrides (useful in tests)
 */
export function createNetworkStore(options: NetworkStoreOptions = {}) {
  const system = markRaw(options.system ?? new System());
  const animations = options.animations ?? createBroadcastAnimations();
  const flashDuration = options.flashDuration ?? 2000;

  const nodes = shallowRef<SystemNode[]>([]);
  const version = ref(0);
  const selectedNodeId = ref<string | null>(null);
  const flashing = ref<string[]>([]);
  const running = ref(false);
  const subscriptions: { unsubscribe(): void }[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();

  /** Signal that domain state may have changed */
  function touch() {
    version.value++;
  }

  function later(fn: () => void, ms: number) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      fn();
    }, ms);
    timers.add(timer);
  }

  subscriptions.push(system.tick.subscribe(() => {
    touch();
    // Nodes process their tick queue asynchronously; refresh once they are done
    later(touch, 50);
  }));

  const nodeIds = computed(() => nodes.value.map(node => node.id));

  const edges = computed<NetworkEdge[]>(() => {
    void version.value;
    const result = new Map<string, NetworkEdge>();
    nodes.value.forEach((node) => {
      node.connectedNodes.forEach(({ node: peer }) => {
        const id = edgeId(node.id, peer.id);
        if (!result.has(id)) {
          const [source, target] = node.id < peer.id ? [node.id, peer.id] : [peer.id, node.id];
          result.set(id, { id, source, target });
        }
      });
    });
    return [...result.values()];
  });

  function getNode(id: string | null | undefined): SystemNode | undefined {
    return id ? nodes.value.find(node => node.id === id) : undefined;
  }

  function getNodeView(id: string): NodeView | undefined {
    void version.value;
    const node = getNode(id);
    if (!node) {
      return undefined;
    }
    return {
      id: node.id,
      address: node.address,
      balance: node.getBalance(),
      isMining: node.isMining,
      miningDelay: node.miningDelay,
      connectedIds: node.connectedNodes.map(item => item.node.id),
    };
  }

  function isConnected(a: string, b: string): boolean {
    void version.value;
    return !!getNode(a)?.connectedNodes.some(item => item.node.id === b);
  }

  function flash(id: string) {
    if (!flashing.value.includes(id)) {
      flashing.value = [...flashing.value, id];
      later(() => {
        flashing.value = flashing.value.filter(item => item !== id);
      }, flashDuration);
    }
  }

  function onNodeEvent(node: SystemNode, event: SystemNodeEvent) {
    let kind: PacketKind | null = null;
    if (event.msg === SystemNode.events.BROADCAST_TX) kind = 'tx';
    if (event.msg === SystemNode.events.BROADCAST_BLOCK) kind = 'block';
    if (kind && event.referrer) {
      const neighbors = node.connectedNodes.map(item => item.node.id);
      resolveBroadcastTargets(node.id, event.referrer.id, neighbors)
        .forEach(target => animations.launch(kind!, node.id, target));
    }
    if (event.msg === SystemNode.events.MESSAGE && event.payload?.type === 'warn') {
      flash(node.id);
    }
    touch();
  }

  /**
   * Add a node to the network (no-op if the id already exists)
   * @param id - Unique node name
   */
  function addNode(id: string): SystemNode {
    const existing = getNode(id);
    if (existing) {
      return existing;
    }
    const node = markRaw(new SystemNode(id, system));
    subscriptions.push(node.eventEmitter.subscribe((event: unknown) => onNodeEvent(node, event as SystemNodeEvent)));
    nodes.value = [...nodes.value, node];
    touch();
    return node;
  }

  /** Next unused name for a node created from the UI */
  function nextNodeName(): string {
    const used = new Set(nodeIds.value);
    const spare = SPARE_NAMES.find(name => !used.has(name));
    if (spare) {
      return spare;
    }
    let index = nodes.value.length + 1;
    while (used.has(`Node${index}`)) index++;
    return `Node${index}`;
  }

  /**
   * Connect two nodes bidirectionally
   * @returns true if a new connection was created
   */
  function connect(a: string, b: string): boolean {
    const nodeA = getNode(a);
    const nodeB = getNode(b);
    if (!nodeA || !nodeB || nodeA === nodeB) {
      return false;
    }
    const created = nodeA.connectToNode(nodeB);
    touch();
    return created;
  }

  /** Remove the connection between two nodes (both directions) */
  function disconnect(a: string, b: string) {
    const nodeA = getNode(a);
    const nodeB = getNode(b);
    if (!nodeA || !nodeB) {
      return;
    }
    nodeA.forgetNode(b);
    nodeB.forgetNode(a);
    animations.purgeEdge(edgeId(a, b));
    touch();
  }

  /** Connect two nodes if they are disconnected, disconnect them otherwise */
  function toggleConnection(a: string, b: string) {
    if (isConnected(a, b)) {
      disconnect(a, b);
    } else {
      connect(a, b);
    }
  }

  function select(id: string | null) {
    selectedNodeId.value = id && getNode(id) ? id : null;
  }

  /**
   * Sign and broadcast a transaction issued by a node
   * @param issuerId - Node that adds the transaction to its pending pool and broadcasts it
   * @param fromAddress - Sender address
   * @param toAddress - Recipient address
   * @param amount - Amount of coins
   * @param signingKey - Key pair of the sender
   * @returns true if the issuing node accepted the transaction
   */
  function orderTransaction(issuerId: string, fromAddress: string, toAddress: string, amount: number, signingKey: unknown): boolean {
    const accepted = !!getNode(issuerId)?.orderTransaction(fromAddress, toAddress, amount, signingKey);
    touch();
    return accepted;
  }

  /**
   * Send coins from one node's wallet to another node's wallet
   * @returns false if the input is invalid or the transaction was rejected
   */
  function sendTransaction(issuerId: string, fromId: string, toId: string, amount: number): boolean {
    const from = getNode(fromId);
    const to = getNode(toId);
    if (!getNode(issuerId) || !from || !to || !(amount > 0)) {
      return false;
    }
    return orderTransaction(issuerId, from.address, to.address, amount, from.keyPair);
  }

  function startMining(id: string) {
    const node = getNode(id);
    if (node && !node.isMining) {
      node.startMining(() => touch());
      touch();
    }
  }

  function validateChain(id: string): boolean {
    return !!getNode(id)?.blockchain.isChainValid();
  }

  function start() {
    if (!running.value) {
      running.value = true;
      system.start();
    }
  }

  function stop() {
    running.value = false;
    system.stop();
  }

  function dispose() {
    stop();
    subscriptions.splice(0).forEach(sub => sub.unsubscribe());
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    animations.clear();
  }

  return {
    system,
    animations,
    nodes,
    nodeIds,
    edges,
    version,
    selectedNodeId,
    flashing,
    running,
    getNode,
    getNodeView,
    isConnected,
    addNode,
    nextNodeName,
    connect,
    disconnect,
    toggleConnection,
    select,
    orderTransaction,
    sendTransaction,
    startMining,
    validateChain,
    start,
    stop,
    dispose,
    touch,
  };
}

export type NetworkStore = ReturnType<typeof createNetworkStore>;

export const NetworkKey: InjectionKey<NetworkStore> = Symbol('network');

/**
 * Create a network store and provide it to all descendants
 * @param store - Optional pre-built store
 */
export function provideNetwork(store: NetworkStore = createNetworkStore()): NetworkStore {
  provide(NetworkKey, store);
  return store;
}

/**
 * Access the network store provided by an ancestor component
 */
export function useNetwork(): NetworkStore {
  const store = inject(NetworkKey);
  if (!store) {
    throw new Error('useNetwork() called without a provided network store');
  }
  return store;
}
