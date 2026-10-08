import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import NodeEditor from '~/components/NodeEditor.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { createTestNetwork, mountWithNetwork } from '../support/network';

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }));
mockNuxtImport('useToast', () => () => ({ add: toastAdd }));

type Exposed = { fromId?: string; toId?: string; txAmount: number };

describe('NodeEditor', () => {
  let network: NetworkStore;

  beforeEach(() => {
    toastAdd.mockClear();
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

  it('asks for a selection when no node is selected', async () => {
    const { wrapper } = await mountEditor(null);
    expect(wrapper.text()).toContain('Select a node to issue transactions');
    expect(wrapper.find('[data-testid="editor-tx-form"]').exists()).toBe(false);
  });

  it('offers all nodes as sender and recipient', async () => {
    const { wrapper } = await mountEditor();
    const selects = wrapper.findAllComponents({ name: 'USelect' });
    expect(selects).toHaveLength(2);
    selects.forEach(select => expect(select.props('items')).toEqual([
      { label: 'Alice', value: 'Alice' },
      { label: 'Bob', value: 'Bob' },
    ]));
  });

  it('only enables submitting a complete transaction', async () => {
    const { wrapper, vm } = await mountEditor();
    const add = () => wrapper.find('[data-testid="editor-add"]');
    expect(add().attributes('disabled')).toBeDefined();
    vm.fromId = 'Alice';
    vm.toId = 'Bob';
    vm.txAmount = 10;
    await wrapper.vm.$nextTick();
    expect(add().attributes('disabled')).toBeUndefined();
  });

  it('issues the transaction through the selected node and reports the result', async () => {
    const send = vi.spyOn(network, 'sendTransaction').mockReturnValue(true);
    const { wrapper, vm } = await mountEditor('Bob');
    vm.fromId = 'Alice';
    vm.toId = 'Bob';
    vm.txAmount = 10;
    await wrapper.find('[data-testid="editor-tx-form"]').trigger('submit');
    expect(send).toHaveBeenCalledWith('Bob', 'Alice', 'Bob', 10);
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Transaction submitted', color: 'info' }));
  });

  it('reports a rejected transaction', async () => {
    const { wrapper, vm } = await mountEditor();
    vm.fromId = 'Alice';
    vm.toId = 'Bob';
    vm.txAmount = 10;
    await wrapper.find('[data-testid="editor-tx-form"]').trigger('submit');
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Transaction rejected', color: 'error' }));
  });

  it('starts mining on the selected node', async () => {
    const mine = vi.spyOn(network, 'startMining').mockImplementation(() => {});
    const { wrapper } = await mountEditor();
    await wrapper.find('[data-testid="editor-mine"]').trigger('click');
    expect(mine).toHaveBeenCalledWith('Alice');
  });

  it('disables mining while the node is mining', async () => {
    const { wrapper } = await mountEditor();
    network.getNode('Alice')!.isMining = true;
    network.touch();
    await wrapper.vm.$nextTick();
    const button = wrapper.find('[data-testid="editor-mine"]');
    expect(button.attributes('disabled')).toBeDefined();
    expect(button.text()).toContain('Mining…');
  });

  it('validates the chain and shows the outcome', async () => {
    const { wrapper } = await mountEditor();
    await wrapper.find('[data-testid="editor-validate"]').trigger('click');
    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Chain is valid', color: 'success' }));

    vi.spyOn(network, 'validateChain').mockReturnValue(false);
    await wrapper.find('[data-testid="editor-validate"]').trigger('click');
    expect(toastAdd).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Chain is invalid', color: 'error' }));
  });
});
