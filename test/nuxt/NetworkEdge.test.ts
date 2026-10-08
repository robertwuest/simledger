import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import NetworkEdge from '~/components/graph/NetworkEdge.vue';
import BroadcastPacket from '~/components/graph/BroadcastPacket.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { createTestNetwork, mountWithNetwork } from '../support/network';

// BaseEdge and EdgeLabelRenderer need a Vue Flow instance; stub them to inspect what the edge renders
const BaseEdgeStub = defineComponent({ name: 'BaseEdge', props: ['id', 'path'], setup: props => () => h('path', { class: 'base-edge', 'data-id': props.id, d: props.path }) });
const EdgeLabelRendererStub = defineComponent({ name: 'EdgeLabelRenderer', setup: (_, { slots }) => () => h('div', { class: 'labels' }, slots.default?.()) });

const graphNode = (id: string, x: number, y: number) => ({
  id,
  computedPosition: { x, y, z: 0 },
  dimensions: { width: 150, height: 80 },
});

describe('NetworkEdge', () => {
  let network: NetworkStore;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    network = createTestNetwork(['Alice', 'Bob'], [['Alice', 'Bob']]);
  });

  afterEach(() => {
    network.dispose();
    vi.unstubAllGlobals();
  });

  const mountEdge = () => mountWithNetwork(NetworkEdge, network, {
    props: {
      id: 'Alice--Bob',
      source: 'Alice',
      target: 'Bob',
      sourceNode: graphNode('Alice', 0, 0) as any,
      targetNode: graphNode('Bob', 400, 0) as any,
    },
    global: { stubs: { BaseEdge: BaseEdgeStub, EdgeLabelRenderer: EdgeLabelRendererStub } },
  });

  it('draws a bezier between the facing sides of both nodes', async () => {
    const wrapper = await mountEdge();
    const path = wrapper.find('.base-edge');
    expect(path.attributes('data-id')).toBe('Alice--Bob');
    expect(path.attributes('d')).toMatch(/^M150,40 C.* 400,40$/);
    expect(wrapper.find('.sml-edge__track').attributes('d')).toBe(path.attributes('d'));
  });

  it('renders the packets of its connection in the right direction', async () => {
    const wrapper = await mountEdge();
    network.animations.launch('tx', 'Alice', 'Bob');
    network.animations.launch('block', 'Bob', 'Alice');
    network.animations.launch('tx', 'Alice', 'Frank');
    await wrapper.vm.$nextTick();
    const packets = wrapper.findAllComponents(BroadcastPacket);
    expect(packets.map(p => [p.props('packet').kind, p.props('reverse')])).toEqual([['tx', false], ['block', true]]);
    expect(packets[0]!.props('path')()).toBe(wrapper.find('.sml-edge__track').element);
  });

  it('removes packets when they expire', async () => {
    const wrapper = await mountEdge();
    vi.useFakeTimers();
    network.animations.launch('tx', 'Alice', 'Bob');
    await wrapper.vm.$nextTick();
    expect(wrapper.findAllComponents(BroadcastPacket)).toHaveLength(1);
    vi.advanceTimersByTime(2000);
    await wrapper.vm.$nextTick();
    expect(wrapper.findAllComponents(BroadcastPacket)).toHaveLength(0);
    vi.useRealTimers();
  });
});
