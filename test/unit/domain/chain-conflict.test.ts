import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { System } from '~~/src/network/system';
import { SystemNode } from '~~/src/network/system_node';
import SmlCommon from '~~/src/common';
import { FakeWorker } from '../../support/fake-worker';
import { genesisKeyPair } from '../../support/fixtures';

interface NodeEvent { msg: string; referrer?: SystemNode; payload?: { type: string; message: string } }

function recordEvents(node: SystemNode) {
  const events: NodeEvent[] = [];
  node.eventEmitter.subscribe(event => events.push(event as NodeEvent));
  return events;
}

const messages = (events: NodeEvent[], type?: string) => events
  .filter(e => e.msg === SystemNode.events.MESSAGE && (!type || e.payload?.type === type))
  .map(e => e.payload!.message);

describe('SystemNode chain conflicts', () => {
  let system: System;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    system = new System();
    system.start();
  });

  afterEach(() => {
    system.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Transfer coins from the genesis wallet to the node and mine them into a block */
  async function mineTransfer(node: SystemNode, amount = 10) {
    expect(node.orderTransaction(node.blockchain.genesisAddress, node.address, amount, genesisKeyPair())).toBe(true);
    const done = vi.fn();
    node.startMining(done);
    await vi.advanceTimersByTimeAsync((node.miningDelay + 2) * System.CycleTime);
    expect(done).toHaveBeenCalled();
  }

  /** Let broadcasts queued for the next ticks propagate */
  const settle = () => vi.advanceTimersByTimeAsync(3 * System.CycleTime);

  it('does not report peers that are only behind', async () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    alice.connectToNode(bob);
    await mineTransfer(alice);
    await settle();
    expect(bob.blockchain.getBlockchainLength()).toBe(2);
    expect(alice.getChainConflicts()).toEqual([]);
    expect(bob.getChainConflicts()).toEqual([]);
  });

  it('adopts a longer chain on connect and reports it in the log', async () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    await mineTransfer(alice, 10);
    await mineTransfer(alice, 10);
    await mineTransfer(bob, 20);
    const bobEvents = recordEvents(bob);
    const aliceEvents = recordEvents(alice);

    alice.connectToNode(bob);

    expect(bob.blockchain.chain.map(b => b.hash)).toEqual(alice.blockchain.chain.map(b => b.hash));
    const adopted = messages(bobEvents, 'log').find(m => m.includes('Adopted'));
    expect(adopted).toContain("Adopted Alice's longer chain (longest-chain rule): 2 → 3 blocks, fork at block #1, 1 own block discarded");
    expect(adopted).toContain('1 transaction returned to the pending pool');
    expect(bobEvents.map(e => e.msg)).toContain(SystemNode.events.CHAIN_ADOPTED);
    // Bob's transfer from the discarded block waits for the next block
    expect(bob.blockchain.pendingTransactions.some(tx => tx.toAddress === bob.address && tx.amount === 20)).toBe(true);
    expect(bob.blockchain.pendingTransactions.filter(tx => tx.fromAddress === '_')).toHaveLength(1);
    expect(bob.blockchain.isChainValid()).toBe(true);
    // The fork resolved itself, nobody reports a conflict
    expect(messages(aliceEvents).some(m => m.includes('Chain conflict'))).toBe(false);
    expect(alice.getChainConflicts()).toEqual([]);
    expect(bob.getChainConflicts()).toEqual([]);
  });

  it('logs when it catches up with missing blocks', async () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    await mineTransfer(alice);
    await mineTransfer(alice);
    const bobEvents = recordEvents(bob);
    alice.connectToNode(bob);
    expect(bob.blockchain.getBlockchainLength()).toBe(3);
    expect(messages(bobEvents, 'log')).toContain('%c⛓: Synchronized 2 missing blocks from Alice: 1 → 3 blocks');
  });

  describe('with chains of equal length', () => {
    let alice: SystemNode;
    let bob: SystemNode;
    let aliceEvents: NodeEvent[];
    let bobEvents: NodeEvent[];

    beforeEach(async () => {
      alice = new SystemNode('Alice', system);
      bob = new SystemNode('Bob', system);
      await mineTransfer(alice, 10);
      await mineTransfer(bob, 20);
      aliceEvents = recordEvents(alice);
      bobEvents = recordEvents(bob);
      alice.connectToNode(bob);
    });

    it('keeps both chains and reports the conflict once on both sides', async () => {
      expect(alice.getChainConflicts()).toEqual([{ peerId: 'Bob', forkIndex: 1, ownLength: 2, peerLength: 2, retained: false }]);
      expect(bob.getChainConflicts()).toEqual([{ peerId: 'Alice', forkIndex: 1, ownLength: 2, peerLength: 2, retained: false }]);
      const conflict = messages(aliceEvents, 'warn').filter(m => m.includes('Chain conflict'));
      expect(conflict).toEqual(["%c⛓: Chain conflict with Bob: chains fork at block #1 (both 2 blocks). Keeping own chain, retain it or adopt Bob's chain in the explorer"]);
      expect(aliceEvents.filter(e => e.msg === SystemNode.events.CHAIN_CONFLICT)).toHaveLength(1);
      expect(bobEvents.filter(e => e.msg === SystemNode.events.CHAIN_CONFLICT)).toHaveLength(1);

      // Further relays of the same blocks are not reported again
      await settle();
      expect(messages(aliceEvents).filter(m => m.includes('Chain conflict'))).toHaveLength(1);
    });

    it('adopts the peer chain on request and broadcasts the new latest block', async () => {
      // Carol synchronizes Alice's chain when connecting
      const carol = new SystemNode('Carol', system);
      alice.connectToNode(carol);
      const carolEvents = recordEvents(carol);
      expect(alice.adoptChain('Bob')).toBe(true);

      expect(alice.blockchain.chain.map(b => b.hash)).toEqual(bob.blockchain.chain.map(b => b.hash));
      expect(bob.getChainConflicts()).toEqual([]);
      expect(messages(aliceEvents, 'log')).toContain(
        "%c⛓: Adopted Bob's chain: 2 → 2 blocks, fork at block #1, 1 own block discarded, 1 transaction returned to the pending pool",
      );
      expect(alice.blockchain.pendingTransactions.some(tx => tx.toAddress === alice.address && tx.amount === 10)).toBe(true);
      expect(alice.getBalance()).toBe(0);
      // Carol still follows Alice's former chain
      expect(alice.getChainConflicts()).toEqual([expect.objectContaining({ peerId: 'Carol', forkIndex: 1 })]);

      await settle();
      const broadcast = aliceEvents.find(e => e.msg === SystemNode.events.BROADCAST_BLOCK);
      expect(broadcast?.referrer).toBe(bob);
      // Equal length: Carol keeps the chain it saw first and reports the conflict
      expect(carol.blockchain.getBlockchainLength()).toBe(2);
      expect(messages(carolEvents, 'warn').some(m => m.includes('Chain conflict with Alice'))).toBe(true);
    });

    it('retains its chain on request until one of the chains changes', async () => {
      expect(alice.retainChain('Bob')).toBe(true);
      expect(alice.getChainConflicts()).toEqual([expect.objectContaining({ peerId: 'Bob', retained: true })]);
      expect(messages(aliceEvents, 'log')).toContain(
        "%c⛓: Retained own chain (2 blocks), ignoring Bob's conflicting chain (2 blocks, fork at block #1)",
      );
      expect(aliceEvents.map(e => e.msg)).toContain(SystemNode.events.CHAIN_RETAINED);
      // The peer decides on its own
      expect(bob.getChainConflicts()).toEqual([expect.objectContaining({ peerId: 'Alice', retained: false })]);

      // Bob's chain grows: the longest-chain rule takes over
      await mineTransfer(bob, 5);
      await settle();
      expect(alice.blockchain.getBlockchainLength()).toBe(3);
      expect(alice.getChainConflicts()).toEqual([]);
    });

    it('ignores requests without a conflict or for unknown peers', () => {
      expect(alice.retainChain('Nobody')).toBe(false);
      expect(alice.adoptChain('Nobody')).toBe(false);
      alice.adoptChain('Bob');
      expect(alice.retainChain('Bob')).toBe(false);
      expect(alice.adoptChain('Bob')).toBe(false);
    });

    it('forgets conflict decisions together with the peer', () => {
      alice.retainChain('Bob');
      alice.forgetNode('Bob');
      expect(alice.getChainConflicts()).toEqual([]);
    });
  });

  it('rejects an invalid longer chain and keeps its own', async () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    await mineTransfer(alice);
    await mineTransfer(alice);
    await mineTransfer(bob);
    // Tamper with Alice's chain after mining
    alice.blockchain.chain[2]!.transactions[0]!.amount = 50;
    const own = bob.blockchain.chain.map(b => b.hash);
    const bobEvents = recordEvents(bob);

    alice.connectToNode(bob);

    expect(bob.blockchain.chain.map(b => b.hash)).toEqual(own);
    expect(messages(bobEvents, 'warn')).toContain("%c⛓: Rejected Alice's longer chain, it failed validation");
    expect(bob.getChainConflicts()).toEqual([expect.objectContaining({ peerId: 'Alice', forkIndex: 1, ownLength: 2, peerLength: 3 })]);
  });

  it('stops mining with a warning when the chain changed in the meantime', async () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    alice.connectToNode(bob);
    alice.orderTransaction(alice.blockchain.genesisAddress, alice.address, 10, genesisKeyPair());
    bob.orderTransaction(bob.blockchain.genesisAddress, bob.address, 10, genesisKeyPair());
    await settle();
    const aliceEvents = recordEvents(alice);
    // Bob rolls the shortest mining delay, his block arrives while Alice is still mining
    vi.spyOn(SmlCommon, 'RandomSeed').mockReturnValueOnce(0).mockReturnValueOnce(5);
    bob.startMining();
    alice.startMining();
    await vi.advanceTimersByTimeAsync(10 * System.CycleTime);

    expect(alice.isMining).toBe(false);
    expect(alice.blockchain.getLatestBlock().rewardAddress).toBe(bob.address);
    expect(messages(aliceEvents, 'warn')).toContain('%c⛏: Mined block #1 rejected, the chain changed while mining');
  });
});
