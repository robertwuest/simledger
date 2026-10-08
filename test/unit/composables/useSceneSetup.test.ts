import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSceneSetup, GENESIS_DELAY } from '~/composables/useSceneSetup';
import { createNetworkStore, type NetworkStore } from '~/composables/useNetwork';
import { defaultScene, simpleScene } from '~/config/scenes';

describe('useSceneSetup', () => {
  let network: NetworkStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    network = createNetworkStore();
  });

  afterEach(() => {
    network.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates the nodes and connections of the default scene', () => {
    useSceneSetup().initializeScene(defaultScene, network);
    expect(network.nodeIds.value).toEqual(['Bob', 'Alice', 'Frank', 'Grace', 'Dave']);
    expect(network.edges.value.map(edge => edge.id).sort()).toEqual(['Alice--Bob', 'Alice--Frank', 'Alice--Grace', 'Frank--Grace']);
  });

  it('orders the genesis transaction after a delay', () => {
    useSceneSetup().initializeScene(simpleScene, network);
    const alice = network.getNode('Alice')!;
    const pending = () => alice.blockchain.pendingTransactions.filter(tx => tx.toAddress === alice.address);
    vi.advanceTimersByTime(GENESIS_DELAY - 1);
    expect(pending()).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(pending().map(tx => tx.amount)).toEqual([simpleScene.genesis!.amount]);
  });

  it('can cancel the pending genesis transaction', () => {
    const cancel = useSceneSetup().initializeScene(simpleScene, network);
    cancel();
    vi.advanceTimersByTime(GENESIS_DELAY);
    expect(network.getNode('Alice')!.blockchain.pendingTransactions.some(tx => tx.amount === 50)).toBe(false);
  });

  it('warns about invalid connections and recipients', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    useSceneSetup().initializeScene({
      name: 'broken',
      nodes: [{ id: 'A' }],
      connections: [{ from: 'A', to: 'Ghost' }],
      genesis: { privateKey: defaultScene.genesis!.privateKey, recipient: 'Ghost', amount: 1 },
    }, network);
    expect(warn).toHaveBeenCalledWith('Connection failed: A -> Ghost');
    expect(warn).toHaveBeenCalledWith('Genesis recipient not found: Ghost');
  });
});
