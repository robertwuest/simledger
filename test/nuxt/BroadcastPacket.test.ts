import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BroadcastPacket from '~/components/graph/BroadcastPacket.vue';
import type { NetworkStore } from '~/composables/useNetwork';
import { createTestNetwork, mountWithNetwork } from '../support/network';

/** Straight path from (0, 0) to (100, 0) */
const line = {
  getTotalLength: () => 100,
  getPointAtLength: (distance: number) => ({ x: distance, y: 0 }),
};

describe('BroadcastPacket', () => {
  let now: number;
  let frames: Map<number, FrameRequestCallback>;
  let frameId: number;
  let reduced: boolean;
  let network: NetworkStore;

  function flushFrame() {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(callback => callback(now));
  }

  beforeEach(() => {
    now = 0;
    frames = new Map();
    frameId = 0;
    reduced = false;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    network = createTestNetwork(['Alice', 'Bob'], [['Alice', 'Bob']], { now: () => now, reducedMotion: () => reduced });
  });

  afterEach(() => {
    network.dispose();
    vi.unstubAllGlobals();
  });

  async function mountPacket(kind: 'tx' | 'block', reverse = false, path: () => typeof line | null = () => line) {
    const packet = network.animations.launch(kind, 'Alice', 'Bob');
    const wrapper = await mountWithNetwork(BroadcastPacket, network, { props: { packet, path, reverse } });
    return { wrapper, packet };
  }

  const coords = (wrapper: Awaited<ReturnType<typeof mountPacket>>['wrapper']) => {
    const el = wrapper.find('.sml-packet').element as HTMLElement;
    return { x: Number(el.dataset.x), y: Number(el.dataset.y), opacity: Number(el.style.opacity) };
  };

  it('renders a transaction packet with its route', async () => {
    const { wrapper } = await mountPacket('tx');
    const el = wrapper.find('[data-testid="packet-tx"]');
    expect(el.exists()).toBe(true);
    expect(el.attributes('data-from')).toBe('Alice');
    expect(el.attributes('data-to')).toBe('Bob');
    expect(el.text()).toContain('Tx');
  });

  it('renders a block packet with the block icon', async () => {
    const { wrapper } = await mountPacket('block');
    expect(wrapper.find('[data-testid="packet-block"] img').attributes('src')).toMatch(/img\/icons\/block\.svg$/);
  });

  it('travels from the start to the end of the edge with easing', async () => {
    const { wrapper } = await mountPacket('tx');
    expect(coords(wrapper)).toMatchObject({ x: 0, opacity: 1 });

    now = 500;
    flushFrame();
    await wrapper.vm.$nextTick();
    expect(coords(wrapper).x).toBe(13); // eased: slower than linear (25) at the start

    now = 1000;
    flushFrame();
    await wrapper.vm.$nextTick();
    expect(coords(wrapper)).toMatchObject({ x: 50, opacity: 1 });

    now = 1600;
    flushFrame();
    await wrapper.vm.$nextTick();
    expect(coords(wrapper).opacity).toBeCloseTo(0.5);

    now = 2000;
    flushFrame();
    await wrapper.vm.$nextTick();
    expect(coords(wrapper)).toMatchObject({ x: 100, opacity: 0 });
    expect(frames.size).toBe(0);
  });

  it('travels backwards when the packet goes against the edge direction', async () => {
    const { wrapper } = await mountPacket('tx', true);
    expect(coords(wrapper).x).toBe(100);
    now = 1000;
    flushFrame();
    await wrapper.vm.$nextTick();
    expect(coords(wrapper).x).toBe(50);
  });

  it('follows the live path when the edge moves', async () => {
    let offset = 0;
    const moving = {
      getTotalLength: () => 100,
      getPointAtLength: (distance: number) => ({ x: distance, y: offset }),
    };
    const { wrapper } = await mountPacket('tx', false, () => moving);
    offset = 40;
    now = 1000;
    flushFrame();
    await wrapper.vm.$nextTick();
    expect(coords(wrapper)).toMatchObject({ x: 50, y: 40 });
  });

  it('stays hidden until the edge path is available', async () => {
    let path: typeof line | null = null;
    const { wrapper } = await mountPacket('tx', false, () => path);
    const el = wrapper.find('.sml-packet').element as HTMLElement;
    expect(el.style.visibility).toBe('hidden');
    path = line;
    now = 100;
    flushFrame();
    await wrapper.vm.$nextTick();
    expect(el.style.visibility).toBe('visible');
  });

  it('shows the packet at its destination when reduced motion is requested', async () => {
    reduced = true;
    const { wrapper } = await mountPacket('tx');
    expect(coords(wrapper)).toMatchObject({ x: 100, opacity: 1 });
  });

  it('cancels its animation frame on unmount', async () => {
    const { wrapper } = await mountPacket('tx');
    const pending = frames.size;
    expect(pending).toBeGreaterThan(0);
    wrapper.unmount();
    expect(frames.size).toBe(pending - 1);
  });
});
