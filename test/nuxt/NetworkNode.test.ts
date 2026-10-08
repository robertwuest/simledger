import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import NetworkNode from '~/components/graph/NetworkNode.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { createTestNetwork, mountWithNetwork } from '../support/network';

// Handles need a Vue Flow node context; their behaviour is covered by the E2E tests
const HandleStub = defineComponent({ name: 'Handle', props: ['type', 'position'], setup: props => () => h('div', { class: 'handle-stub', 'data-type': props.type }) });

describe('NetworkNode', () => {
  let network: NetworkStore;

  beforeEach(() => {
    network = createTestNetwork(['Alice', 'Bob', 'Frank'], [['Alice', 'Bob']]);
  });

  afterEach(() => network.dispose());

  const mountNode = (id = 'Alice') => mountWithNetwork(NetworkNode, network, {
    props: { id },
    global: { stubs: { Handle: HandleStub } },
  });

  it('shows the node name and balance', async () => {
    const wrapper = await mountNode();
    expect(wrapper.find('.sml-node__title').text()).toBe('Alice');
    expect(wrapper.find('[data-testid="node-balance"]').text()).toBe('Balance: 0');
    expect(wrapper.find('[data-testid="network-node"]').attributes('aria-label')).toBe('Alice, balance 0');
  });

  it('renders a target and a source handle', async () => {
    const wrapper = await mountNode();
    expect(wrapper.findAll('.handle-stub').map(handle => handle.attributes('data-type'))).toEqual(['target', 'source']);
  });

  it('updates the balance when the ledger changes', async () => {
    const wrapper = await mountNode();
    const alice = network.getNode('Alice')!;
    alice.blockchain.getBalanceOfAddress = () => 42;
    network.touch();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="node-balance"]').text()).toBe('Balance: 42');
  });

  it('gives every node its own accent color', async () => {
    const alice = await mountNode('Alice');
    const bob = await mountNode('Bob');
    const color = (w: typeof alice) => (w.find('.sml-node').element as HTMLElement).style.getPropertyValue('--sml-node-color');
    expect(color(alice)).toBeTruthy();
    expect(color(alice)).not.toBe(color(bob));
  });

  it('highlights the selected node', async () => {
    const wrapper = await mountNode();
    expect(wrapper.find('.sml-node--selected').exists()).toBe(false);
    network.select('Alice');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.sml-node--selected').exists()).toBe(true);
  });

  it('shows the mining state with lottery die and progress bar', async () => {
    const wrapper = await mountNode();
    expect(wrapper.find('[data-testid="node-mining-icon"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="connection-menu-trigger"]').exists()).toBe(true);

    const alice = network.getNode('Alice')!;
    alice.isMining = true;
    alice.miningDelay = 2;
    network.touch();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.sml-node--mining').exists()).toBe(true);
    expect(wrapper.find('[data-testid="node-mining-icon"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="node-lottery"]').attributes('src')).toMatch(/img\/icons\/die3\.svg$/);
    const bar = wrapper.find('[data-testid="node-progress"] span').element as HTMLElement;
    expect(bar.style.width).toBe('100%');
    expect(bar.style.transitionDuration).toBe('6s');
    expect(wrapper.find('[data-testid="network-node"]').attributes('aria-label')).toBe('Alice, balance 0, mining');
  });

  it('hides the connection menu while mining', async () => {
    const wrapper = await mountNode();
    network.getNode('Alice')!.isMining = true;
    network.touch();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="connection-menu-trigger"]').exists()).toBe(false);
  });

  it('flashes an error indicator on warnings', async () => {
    const wrapper = await mountNode();
    expect(wrapper.find('[data-testid="node-error"]').exists()).toBe(false);
    network.sendTransaction('Alice', 'Alice', 'Bob', 10);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.sml-node--error').exists()).toBe(true);
    expect(wrapper.find('[data-testid="node-error"]').exists()).toBe(true);
  });

  it('renders nothing for an unknown node', async () => {
    const wrapper = await mountNode('Nobody');
    expect(wrapper.find('[data-testid="network-node"]').exists()).toBe(false);
  });
});
