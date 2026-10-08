import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NodeExplorer from '~/components/NodeExplorer.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { genesisKeyPair } from '../support/fixtures';
import { createTestNetwork, mountWithNetwork } from '../support/network';

describe('NodeExplorer', () => {
  let network: NetworkStore;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    network = createTestNetwork(['Alice', 'Bob'], [['Alice', 'Bob']]);
  });

  afterEach(() => {
    network.dispose();
    vi.restoreAllMocks();
  });

  const mountExplorer = () => mountWithNetwork(NodeExplorer, network);
  const lines = (wrapper: Awaited<ReturnType<typeof mountExplorer>>, testId: string) =>
    wrapper.findAll(`[data-testid="${testId}"] li`).map(li => li.text().replace(/\s+/g, ' '));

  it('asks for a selection when no node is selected', async () => {
    const wrapper = await mountExplorer();
    expect(wrapper.text()).toContain('Select a node in the graph');
    expect(wrapper.find('[data-testid="explorer-ledger"]').exists()).toBe(false);
  });

  it('shows the ledger, pending transactions and chain of the selected node', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    expect(lines(wrapper, 'explorer-ledger')).toEqual(['[100] ⚡ Reward → 🎆 Genesis']);
    expect(lines(wrapper, 'explorer-pending')).toEqual(['[10] ⚡ Reward → 🎆 Genesis']);
    expect(wrapper.findAll('[data-testid="explorer-block"]').map(b => b.text())).toEqual(['Block_🎆']);
  });

  it('labels node wallets with the node name and updates with new transactions', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    const alice = network.getNode('Alice')!;
    network.orderTransaction('Alice', alice.blockchain.genesisAddress, network.getNode('Bob')!.address, 30, genesisKeyPair());
    await wrapper.vm.$nextTick();
    expect(lines(wrapper, 'explorer-pending')).toContain('[30] 🎆 Genesis → Bob');
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
  });

  it('explores a block and resets the block when the node changes', async () => {
    network.select('Alice');
    const wrapper = await mountExplorer();
    await wrapper.find('[data-testid="explorer-block"]').trigger('click');
    expect(wrapper.find('[data-testid="explorer-block"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('[data-testid="explorer-chain"] h5').text()).toBe('Explore: Block_0');
    network.select('Bob');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="explorer-chain"] h5').exists()).toBe(false);
  });
});
