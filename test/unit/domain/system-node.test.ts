import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { System } from '~~/src/network/system';
import { SystemNode } from '~~/src/network/system_node';
import { FakeWorker } from '../../support/fake-worker';
import { genesisKeyPair } from '../../support/fixtures';

interface NodeEvent { msg: string; referrer?: SystemNode }

function recordEvents(node: SystemNode) {
  const events: NodeEvent[] = [];
  node.eventEmitter.subscribe(event => events.push(event as NodeEvent));
  return events;
}

describe('SystemNode', () => {
  let system: System;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    system = new System();
  });

  afterEach(() => {
    system.stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('connects bidirectionally and only once', () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    expect(alice.connectToNode(bob)).toBe(true);
    expect(alice.connectToNode(bob)).toBe(false);
    expect(alice.connectedNodes.map(item => item.node.id)).toEqual(['Bob']);
    expect(bob.connectedNodes.map(item => item.node.id)).toEqual(['Alice']);
  });

  it('forgets a peer and unsubscribes from it', () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    alice.connectToNode(bob);
    const { txSub, bkSub } = alice.connectedNodes[0]!;
    alice.forgetNode('Bob');
    expect(alice.connectedNodes).toEqual([]);
    expect(txSub.closed).toBe(true);
    expect(bkSub.closed).toBe(true);
  });

  it('rejects a transaction the sender cannot cover', () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    expect(alice.orderTransaction(alice.address, bob.address, 10, alice.keyPair)).toBe(false);
  });

  it('broadcasts an ordered transaction on the next tick and peers relay it', async () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    const carol = new SystemNode('Carol', system);
    alice.connectToNode(bob);
    bob.connectToNode(carol);
    const aliceEvents = recordEvents(alice);
    const bobEvents = recordEvents(bob);
    system.start();

    const genesis = genesisKeyPair();
    expect(alice.orderTransaction(alice.blockchain.genesisAddress, bob.address, 30, genesis)).toBe(true);
    expect(aliceEvents).toEqual([]);

    await vi.advanceTimersByTimeAsync(System.CycleTime + 10);
    expect(aliceEvents.map(e => e.msg)).toContain(SystemNode.events.BROADCAST_TX);
    expect(aliceEvents.find(e => e.msg === SystemNode.events.BROADCAST_TX)?.referrer).toBe(alice);
    expect(bob.blockchain.pendingTransactions.some(tx => tx.toAddress === bob.address && tx.amount === 30)).toBe(true);

    await vi.advanceTimersByTimeAsync(System.CycleTime + 10);
    const relay = bobEvents.find(e => e.msg === SystemNode.events.BROADCAST_TX);
    expect(relay?.referrer).toBe(alice);
    expect(carol.blockchain.pendingTransactions.some(tx => tx.amount === 30)).toBe(true);
  });

  it('mines a block, broadcasts it and peers adopt it', async () => {
    const alice = new SystemNode('Alice', system);
    const bob = new SystemNode('Bob', system);
    alice.connectToNode(bob);
    const events = recordEvents(alice);
    system.start();
    alice.orderTransaction(alice.blockchain.genesisAddress, bob.address, 30, genesisKeyPair());
    await vi.advanceTimersByTimeAsync(System.CycleTime + 10);

    const done = vi.fn();
    alice.startMining(done);
    expect(alice.isMining).toBe(true);
    expect(alice.miningDelay).toBeGreaterThanOrEqual(0);
    expect(alice.miningDelay).toBeLessThanOrEqual(5);
    expect(events.map(e => e.msg)).toContain(SystemNode.events.START_MINING);

    await vi.advanceTimersByTimeAsync((alice.miningDelay + 2) * System.CycleTime);
    expect(done).toHaveBeenCalled();
    expect(alice.isMining).toBe(false);
    expect(alice.blockchain.getBlockchainLength()).toBe(2);
    expect(events.map(e => e.msg)).toContain(SystemNode.events.BROADCAST_BLOCK);
    expect(bob.blockchain.getBlockchainLength()).toBe(2);
    expect(bob.getBalance()).toBe(30);
  });

  it('reports log messages through the event emitter', () => {
    const alice = new SystemNode('Alice', system);
    const events: any[] = [];
    alice.eventEmitter.subscribe(event => events.push(event));
    alice.orderTransaction(alice.address, alice.blockchain.genesisAddress, 10, alice.keyPair);
    expect(events.some(e => e.msg === SystemNode.events.MESSAGE && e.payload.type === 'warn')).toBe(true);
  });
});
