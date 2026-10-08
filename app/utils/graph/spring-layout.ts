/**
 * Spring (force-directed) layout
 *
 * Port of the Dracula spring layout as a pure function:
 * - Nodes repel each other (Coulomb repulsion)
 * - Edges attract their endpoints (Hooke's law)
 * - Iterates until the graph settles into an organic arrangement
 *
 * Positions are returned in pixels, top-left anchored and starting at `padding`.
 */

export interface LayoutOptions {
  /** Number of force iterations */
  iterations?: number;
  /** Pixels per layout unit */
  scale?: number;
  /** Offset of the top-left most node */
  padding?: number;
  /** Random source for separating overlapping nodes (inject for deterministic layouts) */
  rng?: () => number;
}

export interface Point {
  x: number;
  y: number;
}

const MAX_REPULSIVE_FORCE_DISTANCE = 3.5;
const MAX_ATTRACTIVE_DISTANCE = 6;
/** Weak pull towards the centroid so disconnected nodes don't drift off */
const GRAVITY = 0.05;
const K = 2;
const C = 0.01;
const MAX_VERTEX_MOVEMENT = 0.5;

interface LayoutNode {
  x: number;
  y: number;
  fx: number;
  fy: number;
}

/**
 * Deterministic pseudo random generator (mulberry32)
 * @param seed - Integer seed
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute node positions with a spring layout
 * @param ids - Node ids
 * @param edges - Connections as [sourceId, targetId] pairs
 * @param options - Layout options
 * @returns Map of node id to pixel position
 */
export function computeSpringLayout(
  ids: readonly string[],
  edges: readonly (readonly [string, string])[],
  options: LayoutOptions = {},
): Record<string, Point> {
  const { iterations = 500, scale = 130, padding = 0, rng = seededRandom(42) } = options;
  const nodes = new Map<string, LayoutNode>();
  ids.forEach(id => nodes.set(id, { x: 0, y: 0, fx: 0, fy: 0 }));
  const links = edges
    .map(([a, b]) => [nodes.get(a), nodes.get(b)] as const)
    .filter((pair): pair is readonly [LayoutNode, LayoutNode] => !!pair[0] && !!pair[1] && pair[0] !== pair[1]);
  const list = [...nodes.values()];

  for (let i = 0; i < iterations; i++) {
    for (let a = 0; a < list.length; a++) {
      for (let b = 0; b < a; b++) {
        repulse(list[b]!, list[a]!, rng);
      }
    }
    links.forEach(([a, b]) => attract(a, b, rng));
    const cx = list.reduce((sum, node) => sum + node.x, 0) / list.length;
    const cy = list.reduce((sum, node) => sum + node.y, 0) / list.length;
    list.forEach((node) => {
      node.fx -= GRAVITY * (node.x - cx);
      node.fy -= GRAVITY * (node.y - cy);
      node.x += clamp(C * node.fx, MAX_VERTEX_MOVEMENT);
      node.y += clamp(C * node.fy, MAX_VERTEX_MOVEMENT);
      node.fx = 0;
      node.fy = 0;
    });
  }

  const minX = Math.min(...list.map(node => node.x));
  const minY = Math.min(...list.map(node => node.y));
  const result: Record<string, Point> = {};
  nodes.forEach((node, id) => {
    result[id] = {
      x: Math.round((node.x - minX) * scale + padding),
      y: Math.round((node.y - minY) * scale + padding),
    };
  });
  return result;
}

function delta(a: LayoutNode, b: LayoutNode, rng: () => number) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let d2 = dx * dx + dy * dy;
  if (d2 < 0.01) {
    dx = 0.1 * rng() + 0.1;
    dy = 0.1 * rng() + 0.1;
    d2 = dx * dx + dy * dy;
  }
  return { dx, dy, d2 };
}

function repulse(a: LayoutNode, b: LayoutNode, rng: () => number) {
  const { dx, dy, d2 } = delta(a, b, rng);
  const d = Math.sqrt(d2);
  if (d < MAX_REPULSIVE_FORCE_DISTANCE) {
    const force = (K * K) / d;
    b.fx += (force * dx) / d;
    b.fy += (force * dy) / d;
    a.fx -= (force * dx) / d;
    a.fy -= (force * dy) / d;
  }
}

function attract(a: LayoutNode, b: LayoutNode, rng: () => number) {
  const { dx, dy } = delta(a, b, rng);
  const d = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_ATTRACTIVE_DISTANCE);
  const force = (d * d - K * K) / K;
  b.fx -= (force * dx) / d;
  b.fy -= (force * dy) / d;
  a.fx += (force * dx) / d;
  a.fy += (force * dy) / d;
}

function clamp(value: number, max: number) {
  return Math.max(-max, Math.min(max, value));
}
