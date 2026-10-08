import { describe, expect, it } from 'vitest';
import { easeInOutQuad, packetOpacity, pointOnPath, progressAt, PACKET_FADE_START } from '~/utils/graph/motion';

/** Straight horizontal path from (0, 0) to (100, 0) */
const line = {
  getTotalLength: () => 100,
  getPointAtLength: (distance: number) => ({ x: distance, y: 0 }),
};

describe('easeInOutQuad', () => {
  it('starts at 0, ends at 1 and passes the midpoint at 0.5', () => {
    expect(easeInOutQuad(0)).toBe(0);
    expect(easeInOutQuad(0.5)).toBe(0.5);
    expect(easeInOutQuad(1)).toBe(1);
  });

  it('is symmetric around the midpoint', () => {
    [0.1, 0.25, 0.4].forEach((t) => {
      expect(easeInOutQuad(t) + easeInOutQuad(1 - t)).toBeCloseTo(1);
    });
  });

  it('accelerates then decelerates', () => {
    expect(easeInOutQuad(0.25)).toBeLessThan(0.25);
    expect(easeInOutQuad(0.75)).toBeGreaterThan(0.75);
  });

  it('clamps out-of-range input', () => {
    expect(easeInOutQuad(-1)).toBe(0);
    expect(easeInOutQuad(2)).toBe(1);
    expect(easeInOutQuad(Number.NaN)).toBe(0);
  });
});

describe('packetOpacity', () => {
  it('is fully opaque until the fade starts', () => {
    expect(packetOpacity(0)).toBe(1);
    expect(packetOpacity(PACKET_FADE_START)).toBe(1);
  });

  it('fades linearly to 0 at the end', () => {
    expect(packetOpacity(0.8)).toBeCloseTo(0.5);
    expect(packetOpacity(1)).toBe(0);
  });
});

describe('progressAt', () => {
  it('maps elapsed time to linear progress', () => {
    const timing = { startedAt: 1000, duration: 2000 };
    expect(progressAt(1000, timing)).toBe(0);
    expect(progressAt(2000, timing)).toBe(0.5);
    expect(progressAt(3000, timing)).toBe(1);
  });

  it('clamps before start and after the end', () => {
    const timing = { startedAt: 1000, duration: 2000 };
    expect(progressAt(0, timing)).toBe(0);
    expect(progressAt(9000, timing)).toBe(1);
  });

  it('treats a zero duration as finished', () => {
    expect(progressAt(0, { startedAt: 0, duration: 0 })).toBe(1);
  });
});

describe('pointOnPath', () => {
  it('samples the path forwards', () => {
    expect(pointOnPath(line, 0)).toEqual({ x: 0, y: 0 });
    expect(pointOnPath(line, 0.25)).toEqual({ x: 25, y: 0 });
    expect(pointOnPath(line, 1)).toEqual({ x: 100, y: 0 });
  });

  it('samples the path backwards when reversed', () => {
    expect(pointOnPath(line, 0, true)).toEqual({ x: 100, y: 0 });
    expect(pointOnPath(line, 0.25, true)).toEqual({ x: 75, y: 0 });
    expect(pointOnPath(line, 1, true)).toEqual({ x: 0, y: 0 });
  });
});
