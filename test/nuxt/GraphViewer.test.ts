import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import GraphViewer from '~/components/graph/GraphViewer.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { createTestNetwork, mountWithNetwork } from '../support/network';

type Exposed = {
  flowNodes: { id: string; type: string; position: { x: number; y: number }; deletable: boolean }[];
  flowEdges: { id: string; source: string; target: string; type: string }[];
  onNodeClick(event: { node: { id: string } }): void;
  onConnect(connection: { source: string; target: string }): void;
  onEdgesChange(changes: unknown[]): void;
  autoLayout(): void;
};

describe('GraphViewer', () => {
  let network: NetworkStore;

  beforeEach(() => {
    network = createTestNetwork(['Bob', 'Alice', 'Frank', 'Grace', 'Dave'], [['Bob', 'Alice'], ['Alice', 'Frank'], ['Frank', 'Grace'], ['Alice', 'Grace']]);
  });

  afterEach(() => network.dispose());

  async function mountViewer() {
    const wrapper = await mountWithNetwork(GraphViewer, network, { attachTo: document.body });
    await flushPromises();
    return { wrapper, vm: wrapper.vm as unknown as Exposed };
  }

  it('maps the network nodes to positioned, non-deletable Vue Flow nodes', async () => {
    const { vm } = await mountViewer();
    expect(vm.flowNodes.map(node => node.id)).toEqual(['Bob', 'Alice', 'Frank', 'Grace', 'Dave']);
    expect(vm.flowNodes.every(node => node.type === 'network' && node.deletable === false)).toBe(true);
    const positions = new Set(vm.flowNodes.map(node => `${node.position.x},${node.position.y}`));
    expect(positions.size).toBe(5);
  });

  it('maps the connections to network edges', async () => {
    const { vm } = await mountViewer();
    expect(vm.flowEdges).toEqual([
      { id: 'Alice--Bob', source: 'Alice', target: 'Bob', type: 'network' },
      { id: 'Alice--Frank', source: 'Alice', target: 'Frank', type: 'network' },
      { id: 'Alice--Grace', source: 'Alice', target: 'Grace', type: 'network' },
      { id: 'Frank--Grace', source: 'Frank', target: 'Grace', type: 'network' },
    ]);
  });

  it('renders a custom node per network node', async () => {
    const { wrapper } = await mountViewer();
    expect(wrapper.findAll('[data-testid="network-node"]').map(node => node.attributes('data-node-id')))
      .toEqual(['Bob', 'Alice', 'Frank', 'Grace', 'Dave']);
  });

  it('selects a node on click', async () => {
    const { vm } = await mountViewer();
    vm.onNodeClick({ node: { id: 'Grace' } });
    expect(network.selectedNodeId.value).toBe('Grace');
  });

  it('connects nodes dragged onto each other', async () => {
    const { vm } = await mountViewer();
    vm.onConnect({ source: 'Dave', target: 'Bob' });
    await flushPromises();
    expect(network.isConnected('Bob', 'Dave')).toBe(true);
    expect(vm.flowEdges.map(edge => edge.id)).toContain('Bob--Dave');
  });

  it('disconnects nodes when an edge is removed', async () => {
    const { vm } = await mountViewer();
    vm.onEdgesChange([{ type: 'remove', id: 'Alice--Bob', source: 'Alice', target: 'Bob' }, { type: 'select', id: 'Alice--Frank', selected: true }]);
    await flushPromises();
    expect(network.isConnected('Alice', 'Bob')).toBe(false);
    expect(network.isConnected('Alice', 'Frank')).toBe(true);
    expect(vm.flowEdges.map(edge => edge.id)).not.toContain('Alice--Bob');
  });

  it('places nodes added later next to the existing graph without moving the others', async () => {
    const { vm } = await mountViewer();
    const before = vm.flowNodes.map(node => ({ ...node.position }));
    network.addNode('Erin');
    await flushPromises();
    expect(vm.flowNodes.slice(0, 5).map(node => node.position)).toEqual(before);
    const erin = vm.flowNodes.find(node => node.id === 'Erin')!;
    expect(erin.position.x).toBeGreaterThan(Math.max(...before.map(p => p.x)));
  });

  it('adds and selects a node from the toolbar', async () => {
    const { wrapper } = await mountViewer();
    await wrapper.find('[data-testid="toolbar-add-node"]').trigger('click');
    expect(network.nodeIds.value).toContain('Carol');
    expect(network.selectedNodeId.value).toBe('Carol');
  });

  it('pauses and resumes the simulation from the toolbar', async () => {
    const { wrapper } = await mountViewer();
    network.start();
    await wrapper.find('[data-testid="toolbar-simulation"]').trigger('click');
    expect(network.running.value).toBe(false);
    await wrapper.find('[data-testid="toolbar-simulation"]').trigger('click');
    expect(network.running.value).toBe(true);
  });

  it('re-runs the automatic layout', async () => {
    const { vm } = await mountViewer();
    const original = vm.flowNodes.map(node => ({ ...node.position }));
    vm.flowNodes.splice(0, 1, { ...vm.flowNodes[0]!, position: { x: 9999, y: 9999 } });
    vm.autoLayout();
    await flushPromises();
    expect(vm.flowNodes.map(node => node.position)).toEqual(original);
  });
});
