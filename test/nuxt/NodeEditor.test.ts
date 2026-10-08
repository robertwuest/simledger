import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import NodeEditor from '~/components/NodeEditor.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { genesisKeyPair } from '../support/fixtures';
import { createTestNetwork, mountWithNetwork } from '../support/network';

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }));
mockNuxtImport('useToast', () => () => ({ add: toastAdd }));

type Exposed = {
  state: { from?: string; to?: string; amount: number };
  validate(values: object): { name: string; message: string }[];
};

describe('NodeEditor', () => {
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

  async function mountEditor(selected: string | null = 'Alice') {
    network.select(selected);
    const wrapper = await mountWithNetwork(NodeEditor, network);
    return { wrapper, vm: wrapper.vm as unknown as Exposed };
  }

  async function submit(wrapper: Awaited<ReturnType<typeof mountEditor>>['wrapper']) {
    await wrapper.find('[data-testid="editor-tx-form"]').trigger('submit');
    await flushPromises();
  }

  /** Give Alice a pending, not yet mined transfer so mining is possible */
  function addPendingTransfer() {
    const alice = network.getNode('Alice')!;
    network.orderTransaction('Alice', alice.blockchain.genesisAddress, network.getNode('Bob')!.address, 10, genesisKeyPair());
  }

  it('shows an empty state when no node is selected', async () => {
    const { wrapper } = await mountEditor(null);
    expect(wrapper.text()).toContain('No node selected');
    expect(wrapper.find('[data-testid="editor-tx-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="editor-issuer"]').exists()).toBe(false);
  });

  it('names the issuing node', async () => {
    const { wrapper } = await mountEditor('Bob');
    expect(wrapper.find('[data-testid="editor-issuer"]').text()).toBe('via Bob');
    expect(wrapper.text()).toContain('broadcast via Bob');
  });

  it('offers all nodes with their balance as sender and recipient', async () => {
    const { wrapper } = await mountEditor();
    const selects = wrapper.findAllComponents({ name: 'USelect' });
    expect(selects).toHaveLength(2);
    selects.forEach(select => expect(select.props('items')).toEqual([
      { label: 'Alice', value: 'Alice', description: 'Balance 0' },
      { label: 'Bob', value: 'Bob', description: 'Balance 0' },
    ]));
  });

  it('defaults the sender to the selected node', async () => {
    const { vm } = await mountEditor('Bob');
    expect(vm.state.from).toBe('Bob');
    network.select('Alice');
    await flushPromises();
    expect(vm.state.from).toBe('Bob');
  });

  it('swaps sender and recipient', async () => {
    const { wrapper, vm } = await mountEditor();
    vm.state.to = 'Bob';
    await wrapper.find('[data-testid="editor-swap"]').trigger('click');
    expect(vm.state).toMatchObject({ from: 'Bob', to: 'Alice' });
  });

  it('validates the form', async () => {
    const { vm } = await mountEditor();
    expect(vm.validate({ amount: 0 }).map(e => e.name)).toEqual(['from', 'to', 'amount']);
    expect(vm.validate({ from: 'Alice', to: 'Alice', amount: 5 })).toEqual([{ name: 'to', message: 'Must differ from the sender' }]);
    expect(vm.validate({ from: 'Alice', to: 'Bob', amount: 5 })).toEqual([]);
  });

  it('shows validation errors instead of submitting an invalid transaction', async () => {
    const send = vi.spyOn(network, 'sendTransaction');
    const { wrapper, vm } = await mountEditor();
    vm.state.to = 'Alice';
    await submit(wrapper);
    expect(send).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Must differ from the sender');
    expect(wrapper.text()).toContain('Enter an amount above 0');
  });

  it('shows the available balance and warns when the amount exceeds it', async () => {
    const { wrapper, vm } = await mountEditor();
    expect(wrapper.find('[data-testid="editor-balance"]').text()).toBe('Available: 0');
    vm.state.amount = 10;
    await flushPromises();
    expect(wrapper.find('[data-testid="editor-balance-warning"]').text()).toContain("Exceeds Alice's balance of 0");
  });

  it('issues the transaction through the selected node, reports it and resets the amount', async () => {
    const send = vi.spyOn(network, 'sendTransaction').mockReturnValue(true);
    const { wrapper, vm } = await mountEditor('Bob');
    Object.assign(vm.state, { from: 'Alice', to: 'Bob', amount: 10 });
    await submit(wrapper);
    expect(send).toHaveBeenCalledWith('Bob', 'Alice', 'Bob', 10);
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Transaction submitted', color: 'info' }));
    expect(vm.state.amount).toBe(0);
  });

  it('still submits amounts above the balance and reports the rejection', async () => {
    const { wrapper, vm } = await mountEditor();
    Object.assign(vm.state, { to: 'Bob', amount: 10 });
    await submit(wrapper);
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Transaction rejected', color: 'error' }));
    expect(vm.state.amount).toBe(10);
  });

  it('only allows mining with pending transfers', async () => {
    const mine = vi.spyOn(network, 'startMining').mockImplementation(() => {});
    const { wrapper } = await mountEditor();
    expect(wrapper.find('[data-testid="editor-mine"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('[data-testid="editor-mine-hint"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="editor-pending-count"]').text()).toContain('0 pending transactions');

    addPendingTransfer();
    await flushPromises();
    expect(wrapper.find('[data-testid="editor-pending-count"]').text()).toContain('1 pending transaction ');
    expect(wrapper.find('[data-testid="editor-mine-hint"]').exists()).toBe(false);
    await wrapper.find('[data-testid="editor-mine"]').trigger('click');
    expect(mine).toHaveBeenCalledWith('Alice');
  });

  it('shows the mining progress while the node is mining', async () => {
    const { wrapper } = await mountEditor();
    addPendingTransfer();
    const alice = network.getNode('Alice')!;
    alice.isMining = true;
    alice.miningDelay = 3;
    network.touch();
    await flushPromises();
    const button = wrapper.find('[data-testid="editor-mine"]');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.text()).toContain('Mining…');
    expect(wrapper.find('[data-testid="editor-mining-progress"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('lottery roll 4');
  });

  it('validates the chain and shows the outcome inline', async () => {
    const { wrapper } = await mountEditor();
    await wrapper.find('[data-testid="editor-validate"]').trigger('click');
    expect(wrapper.find('[data-testid="editor-validation"]').text()).toContain('Chain valid');

    vi.spyOn(network, 'validateChain').mockReturnValue(false);
    await wrapper.find('[data-testid="editor-validate"]').trigger('click');
    expect(wrapper.find('[data-testid="editor-validation"]').text()).toContain('Chain invalid');

    network.select('Bob');
    await flushPromises();
    expect(wrapper.find('[data-testid="editor-validation"]').exists()).toBe(false);
  });
});
