import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import NodeExplorer from '~/components/NodeExplorer.vue';
import type { ChainConflict, NetworkStore } from '~/composables/useNetwork';
import { genesisKeyPair } from '../support/fixtures';
import { createTestNetwork, mountWithNetwork } from '../support/network';

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }));
mockNuxtImport('useToast', () => () => ({ add: toastAdd }));

describe('NodeExplorer', () => {
  let network: NetworkStore;

  beforeEach(() => {
    toastAdd.mockClear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    network = createTestNetwork(['Alice', 'Bob'], [['Alice', 'Bob']]);
  });

  afterEach(() => {
    network.dispose();
    vi.restoreAllMocks();
  });

  const mountExplorer = () => mountWithNetwork(NodeExplorer, network);
  type Wrapper = Awaited<ReturnType<typeof mountExplorer>>;

  /** Transactions of a section as "from → to amount" */
  const transactions = (wrapper: Wrapper, testId: string) =>
    wrapper.findAll(`[data-testid="${testId}"] [data-testid="transaction-item"]`).map((item) => {
      const [from, to] = item.findAll('[data-testid="address-label"]').map(label => label.text());
      return `${from} → ${to} ${item.find('[data-testid="transaction-amount"]').text()}`;
    });

  const stat = (wrapper: Wrapper, key: string) => wrapper.find(`[data-testid="explorer-stat-${key}"]`).text();

  function fundBob(amount: number) {
    const alice = network.getNode('Alice')!;
    network.orderTransaction('Alice', alice.blockchain.genesisAddress, network.getNode('Bob')!.address, amount, genesisKeyPair());
  }

  it('shows an empty state when no node is selected', async () => {
    const wrapper = await mountExplorer();
    expect(wrapper.text()).toContain('No node selected');
    expect(wrapper.find('[data-testid="explorer-summary"]').exists()).toBe(false);
  });

  it('summarises the selected node', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    const summary = wrapper.find('[data-testid="explorer-summary"]');
    expect(summary.text()).toContain('Alice');
    const address = network.getNode('Alice')!.address;
    expect(wrapper.find('[data-testid="explorer-address"]').attributes('title')).toBe(address);
    expect(wrapper.find('[data-testid="explorer-address"]').text()).toBe(`${address.slice(0, 6)}…${address.slice(-6)}`);
    expect(stat(wrapper, 'balance')).toBe('0');
    expect(stat(wrapper, 'blocks')).toBe('1');
    expect(stat(wrapper, 'pending')).toBe('1');
  });

  it('lists blocks, pending transactions and the ledger with readable addresses', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    expect(wrapper.findAll('[data-testid="explorer-block"]').map(block => block.text().replace(/\s+/g, ' ')))
      .toEqual([expect.stringMatching(/^#0\s*Genesis\s*1 tx\s*6f5704b956/)]);
    expect(transactions(wrapper, 'explorer-pending')).toEqual(['Mining reward → Genesis 10']);
    expect(transactions(wrapper, 'explorer-ledger')).toEqual(['Mining reward → Genesis 100']);
    expect(wrapper.find('[data-testid="explorer-ledger"] [data-testid="transaction-item"]').text()).toContain('#0');
  });

  it('updates live with new transactions and shows node wallets by name', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    fundBob(30);
    await wrapper.vm.$nextTick();
    expect(transactions(wrapper, 'explorer-pending')).toContain('Genesis → Bob 30');
    expect(stat(wrapper, 'pending')).toBe('2');
  });

  it('expands a block to show its details and transactions', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    const block = wrapper.find('[data-testid="explorer-block"]');
    expect(block.attributes('aria-expanded')).toBe('false');
    await block.trigger('click');
    expect(block.attributes('aria-expanded')).toBe('true');
    const details = wrapper.find('[data-testid="explorer-block-details"]');
    const genesis = network.getNode('Alice')!.blockchain.chain[0]!;
    expect(details.text()).toContain(genesis.hash);
    expect(details.text()).toContain('genesisHash');
    expect(details.text()).toContain('Mined—');
    expect(details.findAll('[data-testid="transaction-item"]')).toHaveLength(1);
    await block.trigger('click');
    expect(wrapper.find('[data-testid="explorer-block-details"]').exists()).toBe(false);
  });

  it('collapses the expanded block when another node is selected', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    await wrapper.find('[data-testid="explorer-block"]').trigger('click');
    network.select('Bob');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="explorer-block-details"]').exists()).toBe(false);
  });

  it('formats block timestamps', async () => {
    const wrapper = await mountExplorer();
    const vm = wrapper.vm as unknown as { formatTimestamp(t: string): string };
    expect(vm.formatTimestamp('0')).toBe('—');
    expect(vm.formatTimestamp(String(new Date(2026, 0, 1, 13, 5, 9).getTime()))).toBe('13:05:09');
  });

  it('copies the wallet address', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    network.select('Bob');
    const wrapper = await mountExplorer();
    await wrapper.find('[data-testid="explorer-copy-address"]').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledWith(network.getNode('Bob')!.address);
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Address copied' }));
    vi.unstubAllGlobals();
  });

  it('reports when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    network.select('Bob');
    const wrapper = await mountExplorer();
    await wrapper.find('[data-testid="explorer-copy-address"]').trigger('click');
    await flushPromises();
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Copy failed', color: 'error' }));
    vi.unstubAllGlobals();
  });

  it('follows the selection made in the graph', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    expect(wrapper.findComponent({ name: 'USelect' }).props('modelValue')).toBe('Alice');
    network.select('Bob');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'USelect' }).props('modelValue')).toBe('Bob');
  });

  it('selects the node in the store when picked from the dropdown', async () => {
    const wrapper = await mountExplorer();
    expect(wrapper.findComponent({ name: 'USelect' }).props('items')).toEqual([
      { label: 'Alice', value: 'Alice' },
      { label: 'Bob', value: 'Bob' },
    ]);
    wrapper.findComponent({ name: 'USelect' }).vm.$emit('update:modelValue', 'Bob');
    expect(network.selectedNodeId.value).toBe('Bob');
    wrapper.findComponent({ name: 'USelect' }).vm.$emit('update:modelValue', undefined);
    expect(network.selectedNodeId.value).toBeNull();
  });
  describe('chain conflicts', () => {
    const conflict = (overrides: Partial<ChainConflict> = {}): ChainConflict => ({ peerId: 'Bob', forkIndex: 1, ownLength: 2, peerLength: 2, retained: false, ...overrides });

    /** Pretend Alice's chain diverges from Bob's; the domain behaviour is covered by the unit tests */
    function stubConflicts(...conflicts: ChainConflict[]) {
      const alice = network.getNode('Alice')!;
      const genesis = alice.blockchain.chain[0]!;
      alice.blockchain.chain.push({ ...genesis, hash: 'f0rk', previousHash: genesis.hash, timestamp: '1', transactions: [] } as any);
      return {
        get: vi.spyOn(alice, 'getChainConflicts').mockReturnValue(conflicts),
        retain: vi.spyOn(alice, 'retainChain').mockReturnValue(true),
        adopt: vi.spyOn(alice, 'adoptChain').mockReturnValue(true),
      };
    }

    const alerts = (wrapper: Wrapper) => wrapper.findAll('[data-testid="explorer-conflict"]');

    it('shows no conflicts while all chains agree', async () => {
      network.select('Alice');
      const wrapper = await mountExplorer();
      expect(wrapper.find('[data-testid="explorer-conflicts"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="explorer-block-forked"]').exists()).toBe(false);
    });

    it('explains an open conflict and marks the forked blocks', async () => {
      stubConflicts(conflict());
      network.select('Alice');
      const wrapper = await mountExplorer();
      const [alert] = alerts(wrapper);
      expect(alert!.attributes('data-peer-id')).toBe('Bob');
      expect(alert!.text()).toContain('Chain conflict with Bob');
      expect(alert!.text()).toContain('Chains fork at block #1: Alice has 2, Bob has 2 blocks.');
      expect(alert!.find('[data-testid="explorer-conflict-hint"]').text()).toBe('Both chains have the same length, the longest-chain rule cannot decide.');
      expect(alert!.find('[data-testid="explorer-conflict-retain"]').text()).toBe('Retain own chain');
      expect(alert!.find('[data-testid="explorer-conflict-adopt"]').text()).toBe("Adopt Bob's chain");
      // Newest first: the forked block #1 is marked, the genesis block is shared
      expect(wrapper.findAll('[data-testid="explorer-block"]').map(block => block.find('[data-testid="explorer-block-forked"]').exists())).toEqual([true, false]);
    });

    it('describes what the longest-chain rule would do', async () => {
      const wrapper = await mountExplorer();
      const vm = wrapper.vm as unknown as { conflictHint(c: ChainConflict): string };
      expect(vm.conflictHint(conflict({ peerLength: 3 }))).toBe("Bob's chain is longer, the longest-chain rule would adopt it.");
      expect(vm.conflictHint(conflict({ ownLength: 3 }))).toBe('The own chain is longer, the longest-chain rule keeps it.');
      expect(vm.conflictHint(conflict({ retained: true }))).toContain('Decided until one of the chains changes');
    });

    it('retains the own chain', async () => {
      const { retain } = stubConflicts(conflict());
      network.select('Alice');
      const wrapper = await mountExplorer();
      await wrapper.find('[data-testid="explorer-conflict-retain"]').trigger('click');
      expect(retain).toHaveBeenCalledWith('Bob');
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Chain retained' }));
    });

    it("adopts the peer's chain", async () => {
      const { adopt } = stubConflicts(conflict());
      network.select('Alice');
      const wrapper = await mountExplorer();
      await wrapper.find('[data-testid="explorer-conflict-adopt"]').trigger('click');
      expect(adopt).toHaveBeenCalledWith('Bob');
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Chain adopted', color: 'success' }));
    });

    it('reports a chain that failed validation', async () => {
      const { adopt } = stubConflicts(conflict());
      adopt.mockReturnValue(false);
      network.select('Alice');
      const wrapper = await mountExplorer();
      await wrapper.find('[data-testid="explorer-conflict-adopt"]').trigger('click');
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Chain not adopted', color: 'error' }));
    });

    it('lists retained conflicts after open ones, still offering to adopt', async () => {
      stubConflicts(conflict({ peerId: 'Carol', retained: true }), conflict({ peerId: 'Dave' }));
      network.select('Alice');
      const wrapper = await mountExplorer();
      expect(alerts(wrapper).map(alert => alert.attributes('data-peer-id'))).toEqual(['Dave', 'Carol']);
      const retained = alerts(wrapper)[1]!;
      expect(retained.text()).toContain("Keeping own chain over Carol's");
      expect(retained.find('[data-testid="explorer-conflict-retain"]').exists()).toBe(false);
      expect(retained.find('[data-testid="explorer-conflict-adopt"]').exists()).toBe(true);
    });

    it('does not mark blocks for retained conflicts', async () => {
      stubConflicts(conflict({ retained: true }));
      network.select('Alice');
      const wrapper = await mountExplorer();
      expect(wrapper.find('[data-testid="explorer-block-forked"]').exists()).toBe(false);
    });
  });
});
