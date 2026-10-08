import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import ConnectionMenu from '~/components/graph/ConnectionMenu.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { createTestNetwork, mountWithNetwork } from '../support/network';

describe('ConnectionMenu', () => {
  let network: NetworkStore;

  beforeEach(() => {
    network = createTestNetwork(['Alice', 'Bob', 'Frank'], [['Alice', 'Bob']]);
  });

  afterEach(() => {
    network.dispose();
    document.body.innerHTML = '';
  });

  const mountMenu = (props: { nodeId: string; disabled?: boolean } = { nodeId: 'Alice' }) =>
    mountWithNetwork(ConnectionMenu, network, { props, attachTo: document.body });

  const items = (wrapper: Awaited<ReturnType<typeof mountMenu>>) =>
    wrapper.findComponent({ name: 'UDropdownMenu' }).props('items') as any[][];

  it('lists every other node with its connection state', async () => {
    const wrapper = await mountMenu();
    const peers = items(wrapper)[1]!;
    expect(peers.map(item => [item.label, item.checked])).toEqual([['Bob', true], ['Frank', false]]);
    expect(peers.every(item => item.type === 'checkbox')).toBe(true);
  });

  it('toggles the connection of a peer', async () => {
    const wrapper = await mountMenu();
    items(wrapper)[1]!.find(item => item.label === 'Frank').onUpdateChecked(true);
    expect(network.isConnected('Alice', 'Frank')).toBe(true);
    items(wrapper)[1]!.find(item => item.label === 'Bob').onUpdateChecked(false);
    expect(network.isConnected('Alice', 'Bob')).toBe(false);
  });

  it('keeps the menu open after toggling', async () => {
    const wrapper = await mountMenu();
    const event = new Event('select', { cancelable: true });
    items(wrapper)[1]![0].onSelect(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('opens from the keyboard and connects a peer', async () => {
    const wrapper = await mountMenu();
    await wrapper.find('[data-testid="connection-menu-trigger"]').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    const entry = [...document.body.querySelectorAll('[role="menuitemcheckbox"]')].find(el => el.textContent?.includes('Frank')) as HTMLElement;
    expect(entry).toBeTruthy();
    expect(entry.getAttribute('aria-checked')).toBe('false');
    entry.click();
    await flushPromises();
    expect(network.isConnected('Alice', 'Frank')).toBe(true);
  });

  it('can be disabled', async () => {
    const wrapper = await mountMenu({ nodeId: 'Alice', disabled: true });
    expect(wrapper.find('[data-testid="connection-menu-trigger"]').attributes('disabled')).toBeDefined();
  });
});
