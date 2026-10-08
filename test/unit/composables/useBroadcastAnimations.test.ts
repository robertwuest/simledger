import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBroadcastAnimations, prefersReducedMotion } from '~/composables/useBroadcastAnimations';

describe('createBroadcastAnimations', () => {
  let now = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    now = 1000;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('launches a packet on the canonical edge with its direction', () => {
    const animations = createBroadcastAnimations({ now: () => now });
    const packet = animations.launch('tx', 'Bob', 'Alice');
    expect(packet).toMatchObject({ kind: 'tx', edgeId: 'Alice--Bob', fromId: 'Bob', toId: 'Alice', startedAt: 1000, duration: 2000 });
    expect(animations.packetsFor('Alice--Bob')).toEqual([packet]);
    expect(animations.packetsFor('Alice--Frank')).toEqual([]);
  });

  it('keeps concurrent packets apart', () => {
    const animations = createBroadcastAnimations({ now: () => now });
    const a = animations.launch('tx', 'Bob', 'Alice');
    const b = animations.launch('block', 'Alice', 'Bob');
    expect(a.id).not.toBe(b.id);
    expect(animations.packetsFor('Alice--Bob')).toHaveLength(2);
  });

  it('removes packets once their travel time is over', () => {
    const animations = createBroadcastAnimations({ duration: 500, now: () => now });
    animations.launch('tx', 'Bob', 'Alice');
    vi.advanceTimersByTime(499);
    expect(animations.packets.value).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(animations.packets.value).toHaveLength(0);
  });

  it('purges the packets of a removed edge only', () => {
    const animations = createBroadcastAnimations({ now: () => now });
    animations.launch('tx', 'Bob', 'Alice');
    animations.launch('tx', 'Alice', 'Frank');
    animations.purgeEdge('Alice--Bob');
    expect(animations.packets.value.map(p => p.edgeId)).toEqual(['Alice--Frank']);
    vi.runAllTimers();
    expect(animations.packets.value).toEqual([]);
  });

  it('clears all packets and pending timers', () => {
    const animations = createBroadcastAnimations({ now: () => now });
    animations.launch('tx', 'Bob', 'Alice');
    animations.launch('block', 'Alice', 'Frank');
    animations.clear();
    expect(animations.packets.value).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('exposes the reduced motion preference', () => {
    expect(createBroadcastAnimations({ reducedMotion: () => true }).reducedMotion()).toBe(true);
    expect(createBroadcastAnimations({ reducedMotion: () => false }).reducedMotion()).toBe(false);
  });
});

describe('prefersReducedMotion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false without a browser window', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reads the media query', () => {
    vi.stubGlobal('window', { matchMedia: (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' }) });
    expect(prefersReducedMotion()).toBe(true);
  });
});
