/**
 * Motion helpers for packets travelling along network edges
 */

/** Default travel time of a packet along an edge, matches one simulation cycle */
export const PACKET_DURATION = 2000;

/** Fraction of the travel time after which a packet starts to fade out */
export const PACKET_FADE_START = 0.6;

export interface PacketTiming {
  startedAt: number;
  duration: number;
}

/**
 * Quadratic ease-in-out (equivalent to GSAP's `power1.inOut`)
 * @param t - Linear progress in [0, 1]
 */
export function easeInOutQuad(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/**
 * Packet opacity for a given linear progress: fully visible until
 * PACKET_FADE_START, then fading linearly to 0.
 * @param t - Linear progress in [0, 1]
 */
export function packetOpacity(t: number): number {
  const x = clamp01(t);
  if (x <= PACKET_FADE_START) {
    return 1;
  }
  return 1 - (x - PACKET_FADE_START) / (1 - PACKET_FADE_START);
}

/**
 * Linear progress of a packet at a point in time
 * @param now - Current timestamp (same clock as startedAt)
 * @param timing - Packet start time and duration
 */
export function progressAt(now: number, timing: PacketTiming): number {
  if (timing.duration <= 0) {
    return 1;
  }
  return clamp01((now - timing.startedAt) / timing.duration);
}

/** Minimal subset of SVGPathElement needed to sample a point */
export interface PathLike {
  getTotalLength(): number;
  getPointAtLength(distance: number): { x: number; y: number };
}

/**
 * Point on a path at a given progress
 * @param path - SVG path element (or compatible object)
 * @param t - Progress in [0, 1]
 * @param reverse - Travel from the path end towards its start
 */
export function pointOnPath(path: PathLike, t: number, reverse = false): { x: number; y: number } {
  const length = path.getTotalLength();
  const progress = reverse ? 1 - clamp01(t) : clamp01(t);
  const point = path.getPointAtLength(length * progress);
  return { x: point.x, y: point.y };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
