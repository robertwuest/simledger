import { describe, expect, it } from 'vitest';
import { computeSpringLayout, seededRandom, type Point } from '~/utils/graph/spring-layout';
import { defaultScene } from '~/config/scenes';

const ids = defaultScene.nodes.map(node => node.id);
const edges = defaultScene.connections.map(conn => [conn.from, conn.to] as const);
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe('seededRandom', () => {
  it('is deterministic for a seed and stays within [0, 1)', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    for (let i = 0; i < 100; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('computeSpringLayout', () => {
  it('returns a position for every node', () => {
    const positions = computeSpringLayout(ids, edges);
    expect(Object.keys(positions).sort()).toEqual([...ids].sort());
  });

  it('is deterministic with the same random source', () => {
    expect(computeSpringLayout(ids, edges, { rng: seededRandom(1) }))
      .toEqual(computeSpringLayout(ids, edges, { rng: seededRandom(1) }));
  });

  it('anchors the layout at the padding', () => {
    const positions = Object.values(computeSpringLayout(ids, edges, { padding: 20 }));
    expect(Math.min(...positions.map(p => p.x))).toBe(20);
    expect(Math.min(...positions.map(p => p.y))).toBe(20);
  });

  it('keeps node cards (150 x 80) from overlapping', () => {
    const positions = computeSpringLayout(ids, edges);
    for (const a of ids) {
      for (const b of ids) {
        if (a < b) {
          const pa = positions[a]!;
          const pb = positions[b]!;
          const overlap = Math.abs(pa.x - pb.x) < 150 && Math.abs(pa.y - pb.y) < 80;
          expect(overlap, `${a} overlaps ${b}`).toBe(false);
        }
      }
    }
  });

  it('places connected nodes closer together than unconnected ones', () => {
    const positions = computeSpringLayout(ids, edges);
    const connected = edges.map(([a, b]) => distance(positions[a]!, positions[b]!));
    const isolated = ids.filter(id => id !== 'Dave').map(id => distance(positions[id]!, positions.Dave!));
    expect(Math.max(...connected)).toBeLessThan(Math.min(...isolated));
  });

  it('keeps disconnected nodes within reach', () => {
    const positions = computeSpringLayout(ids, edges);
    const nearest = Math.min(...ids.filter(id => id !== 'Dave').map(id => distance(positions[id]!, positions.Dave!)));
    expect(nearest).toBeLessThan(600);
  });

  it('handles a single node and ignores unknown or self edges', () => {
    expect(computeSpringLayout(['A'], [['A', 'A'], ['A', 'X']])).toEqual({ A: { x: 0, y: 0 } });
  });
});
