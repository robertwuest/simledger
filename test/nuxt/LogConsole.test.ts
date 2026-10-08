import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LogConsole from '~/components/LogConsole.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { SystemNode } from '~~/src/network/system_node';
import { createTestNetwork, mountWithNetwork } from '../support/network';

function log(node: SystemNode, type: string, message: string) {
  node.eventEmitter.next({ msg: SystemNode.events.MESSAGE, referrer: node, payload: { type, message } });
}

describe('LogConsole', () => {
  let network: NetworkStore;

  beforeEach(() => {
    network = createTestNetwork(['Alice', 'Bob']);
  });

  afterEach(() => network.dispose());

  const mountConsole = () => mountWithNetwork(LogConsole, network);
  const entries = (wrapper: Awaited<ReturnType<typeof mountConsole>>) => wrapper.findAll('[data-testid="console-entry"]');

  it('shows an empty state', async () => {
    const wrapper = await mountConsole();
    expect(wrapper.text()).toContain('No log entries yet.');
  });

  it('lists node messages with their severity, without console styling codes', async () => {
    const wrapper = await mountConsole();
    log(network.getNode('Alice')!, 'warn', '%c⇄: Insufficient balance');
    log(network.getNode('Bob')!, 'log', 'Block added');
    await wrapper.vm.$nextTick();
    const rows = entries(wrapper);
    expect(rows.map(row => row.attributes('data-type'))).toEqual(['warn', 'log']);
    expect(rows[0]!.find('.sml-console__node').text()).toBe('Alice');
    expect(rows[0]!.find('.sml-console__message').text()).toBe('⇄: Insufficient balance');
  });

  it('ignores other node events', async () => {
    const wrapper = await mountConsole();
    const alice = network.getNode('Alice')!;
    alice.eventEmitter.next({ msg: SystemNode.events.BROADCAST_TX, referrer: alice });
    await wrapper.vm.$nextTick();
    expect(entries(wrapper)).toHaveLength(0);
  });

  it('subscribes to nodes added later', async () => {
    const wrapper = await mountConsole();
    const frank = network.addNode('Frank');
    await wrapper.vm.$nextTick();
    log(frank, 'error', 'boom');
    await wrapper.vm.$nextTick();
    expect(entries(wrapper)).toHaveLength(1);
  });

  it('keeps at most 400 entries', async () => {
    const wrapper = await mountConsole();
    const alice = network.getNode('Alice')!;
    for (let i = 0; i < 405; i++) log(alice, 'log', `message ${i}`);
    await wrapper.vm.$nextTick();
    const rows = entries(wrapper);
    expect(rows).toHaveLength(400);
    expect(rows[0]!.find('.sml-console__message').text()).toBe('message 5');
  });

  it('clears all entries', async () => {
    const wrapper = await mountConsole();
    log(network.getNode('Alice')!, 'log', 'hello');
    await wrapper.vm.$nextTick();
    await wrapper.find('[data-testid="console-clear"]').trigger('click');
    expect(entries(wrapper)).toHaveLength(0);
  });

  it('unsubscribes from all nodes on unmount', async () => {
    const wrapper = await mountConsole();
    const alice = network.getNode('Alice')!;
    const observers = () => (alice.eventEmitter as unknown as { observers: unknown[] }).observers.length;
    const subscribed = observers();
    wrapper.unmount();
    expect(observers()).toBe(subscribed - 1);
  });
});
