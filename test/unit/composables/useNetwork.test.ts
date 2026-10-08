import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNetworkStore, type NetworkStore } from '~/composables/useNetwork';
import { createBroadcastAnimations } from '~/composables/useBroadcastAnimations';
import { System } from '~~/src/network/system';
import { SystemNode } from '~~/src/network/system_node';
import { FakeWorker } from '../../support/fake-worker';
import { genesisKeyPair } from '../../support/fixtures';

describe('createNetworkStore', () => {
  let network: NetworkStore;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', FakeWorker);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    network = createNetworkStore({ animations: createBroadcastAnimations({ now: () => Date.now(), reducedMotion: () => false }) });
  });

  afterEach(() => {
    network.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Order a genesis-funded transfer issued by `issuerId` */
  function fund(issuerId: string, recipientId: string, amount: number) {
    const genesis = genesisKeyPair();
    return network.orderTransaction(issuerId, network.getNode(issuerId)!.blockchain.genesisAddress, network.getNode(recipientId)!.address, amount, genesis);
  }

  describe('nodes', () => {
    it('adds nodes once and keeps their order', () => {
      const alice = network.addNode('Alice');
      network.addNode('Bob');
      expect(network.addNode('Alice')).toBe(alice);
      expect(network.nodeIds.value).toEqual(['Alice', 'Bob']);
      expect(alice).toBeInstanceOf(SystemNode);
    });

    it('bumps the version on changes', () => {
      const before = network.version.value;
      network.addNode('Alice');
      expect(network.version.value).toBeGreaterThan(before);
    });

    it('provides a plain view model of a node', () => {
      network.addNode('Alice');
      network.addNode('Bob');
      network.connect('Alice', 'Bob');
      expect(network.getNodeView('Alice')).toMatchObject({ id: 'Alice', balance: 0, isMining: false, connectedIds: ['Bob'] });
      expect(network.getNodeView('Nobody')).toBeUndefined();
    });

    it('suggests unused names for new nodes', () => {
      network.addNode('Carol');
      expect(network.nextNodeName()).toBe('Erin');
    });
  });

  describe('connections', () => {
    beforeEach(() => {
      ['Alice', 'Bob', 'Frank'].forEach(id => network.addNode(id));
    });

    it('derives canonical edges from the peer connections', () => {
      network.connect('Bob', 'Alice');
      network.connect('Alice', 'Frank');
      expect(network.edges.value).toEqual([
        { id: 'Alice--Bob', source: 'Alice', target: 'Bob' },
        { id: 'Alice--Frank', source: 'Alice', target: 'Frank' },
      ]);
      expect(network.isConnected('Alice', 'Bob')).toBe(true);
      expect(network.isConnected('Bob', 'Alice')).toBe(true);
    });

    it('ignores self connections and unknown nodes', () => {
      expect(network.connect('Alice', 'Alice')).toBe(false);
      expect(network.connect('Alice', 'Nobody')).toBe(false);
      expect(network.edges.value).toEqual([]);
    });

    it('disconnects from either side', () => {
      network.connect('Alice', 'Bob');
      network.disconnect('Bob', 'Alice');
      expect(network.edges.value).toEqual([]);
      expect(network.getNode('Alice')!.connectedNodes).toEqual([]);
      expect(network.getNode('Bob')!.connectedNodes).toEqual([]);
    });

    it('toggles a connection', () => {
      network.toggleConnection('Alice', 'Frank');
      expect(network.isConnected('Alice', 'Frank')).toBe(true);
      network.toggleConnection('Frank', 'Alice');
      expect(network.isConnected('Alice', 'Frank')).toBe(false);
    });

    it('drops in-flight packets of a removed connection', () => {
      network.connect('Alice', 'Bob');
      network.animations.launch('tx', 'Alice', 'Bob');
      network.disconnect('Alice', 'Bob');
      expect(network.animations.packets.value).toEqual([]);
    });
  });

  describe('selection', () => {
    it('selects known nodes only', () => {
      network.addNode('Alice');
      network.select('Alice');
      expect(network.selectedNodeId.value).toBe('Alice');
      network.select('Nobody');
      expect(network.selectedNodeId.value).toBeNull();
    });
  });

  describe('broadcast animations', () => {
    beforeEach(() => {
      ['Alice', 'Bob', 'Frank', 'Grace'].forEach(id => network.addNode(id));
      network.connect('Bob', 'Alice');
      network.connect('Alice', 'Frank');
      network.connect('Alice', 'Grace');
      network.start();
    });

    it('animates an originated transaction along every edge of the issuer', async () => {
      expect(fund('Alice', 'Bob', 10)).toBe(true);
      await vi.advanceTimersByTimeAsync(System.CycleTime + 10);
      const packets = network.animations.packets.value.filter(p => p.fromId === 'Alice');
      expect(packets.map(p => p.toId).sort()).toEqual(['Bob', 'Frank', 'Grace']);
      expect(packets.every(p => p.kind === 'tx')).toBe(true);
    });

    it('relays skip the edge back to the referrer', async () => {
      fund('Bob', 'Alice', 10);
      await vi.advanceTimersByTimeAsync(System.CycleTime + 10);
      expect(network.animations.packets.value.map(p => `${p.fromId}->${p.toId}`)).toEqual(['Bob->Alice']);
      await vi.advanceTimersByTimeAsync(System.CycleTime);
      const relayed = network.animations.packets.value.filter(p => p.fromId === 'Alice').map(p => p.toId).sort();
      expect(relayed).toEqual(['Frank', 'Grace']);
    });

    it('animates mined blocks', async () => {
      fund('Alice', 'Bob', 10);
      await vi.advanceTimersByTimeAsync(System.CycleTime + 10);
      network.startMining('Alice');
      expect(network.getNodeView('Alice')!.isMining).toBe(true);
      await vi.advanceTimersByTimeAsync(8 * System.CycleTime);
      expect(network.getNodeView('Alice')!.isMining).toBe(false);
      expect(network.getNode('Bob')!.blockchain.getBlockchainLength()).toBe(2);
      expect(network.validateChain('Bob')).toBe(true);
    });
  });

  describe('transactions', () => {
    beforeEach(() => {
      network.addNode('Alice');
      network.addNode('Bob');
    });

    it('rejects invalid input', () => {
      expect(network.sendTransaction('Alice', 'Alice', 'Nobody', 10)).toBe(false);
      expect(network.sendTransaction('Alice', 'Alice', 'Bob', 0)).toBe(false);
      expect(network.sendTransaction('Nobody', 'Alice', 'Bob', 10)).toBe(false);
    });

    it('reports transactions the issuer rejects', () => {
      expect(network.sendTransaction('Alice', 'Alice', 'Bob', 10)).toBe(false);
    });
  });

  describe('error flash', () => {
    it('flashes a node once per warning burst and clears it after the flash duration', () => {
      network.addNode('Alice');
      network.addNode('Bob');
      network.sendTransaction('Alice', 'Alice', 'Bob', 10);
      network.sendTransaction('Alice', 'Alice', 'Bob', 10);
      expect(network.flashing.value).toEqual(['Alice']);
      vi.advanceTimersByTime(1999);
      expect(network.flashing.value).toEqual(['Alice']);
      vi.advanceTimersByTime(1);
      expect(network.flashing.value).toEqual([]);
    });

    it('flashes nodes without any connection', () => {
      network.addNode('Dave');
      network.addNode('Bob');
      network.sendTransaction('Dave', 'Dave', 'Bob', 10);
      expect(network.flashing.value).toEqual(['Dave']);
    });
  });

  describe('simulation lifecycle', () => {
    it('starts the clock only once', () => {
      const ticks: number[] = [];
      network.system.tick.subscribe(tick => ticks.push(tick.increment));
      network.start();
      network.start();
      vi.advanceTimersByTime(System.CycleTime * 2);
      expect(ticks).toEqual([0, 1, 2, 3]);
      expect(network.running.value).toBe(true);
    });

    it('pauses and resumes', () => {
      network.start();
      network.stop();
      expect(network.running.value).toBe(false);
      const increment = network.system.tick.value.increment;
      vi.advanceTimersByTime(System.CycleTime * 3);
      expect(network.system.tick.value.increment).toBe(increment + 1);
      network.start();
      expect(network.running.value).toBe(true);
    });

    it('stops listening to nodes after dispose', () => {
      network.addNode('Alice');
      network.addNode('Bob');
      network.dispose();
      network.sendTransaction('Alice', 'Alice', 'Bob', 10);
      expect(network.flashing.value).toEqual([]);
      expect(network.running.value).toBe(false);
    });
  });
});
