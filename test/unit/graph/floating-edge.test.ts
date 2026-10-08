import { describe, expect, it } from 'vitest';
import { getFloatingEdgeParams, getRectIntersection, getSide } from '~/utils/graph/floating-edge';

const card = (x: number, y: number) => ({ x, y, width: 150, height: 80 });

describe('getRectIntersection', () => {
  it('exits on the right edge towards a node on the right', () => {
    expect(getRectIntersection(card(0, 0), card(400, 0))).toEqual({ x: 150, y: 40 });
  });

  it('exits on the bottom edge towards a node below', () => {
    expect(getRectIntersection(card(0, 0), card(0, 300))).toEqual({ x: 75, y: 80 });
  });

  it('falls back to the center for coincident nodes', () => {
    expect(getRectIntersection(card(0, 0), card(0, 0))).toEqual({ x: 75, y: 40 });
  });
});

describe('getSide', () => {
  it('detects every side of the rectangle', () => {
    const rect = card(0, 0);
    expect(getSide(rect, { x: 0, y: 40 })).toBe('left');
    expect(getSide(rect, { x: 150, y: 40 })).toBe('right');
    expect(getSide(rect, { x: 75, y: 0 })).toBe('top');
    expect(getSide(rect, { x: 75, y: 80 })).toBe('bottom');
  });
});

describe('getFloatingEdgeParams', () => {
  it('connects the facing sides of two nodes', () => {
    const params = getFloatingEdgeParams(card(0, 0), card(400, 0));
    expect(params).toMatchObject({ sx: 150, sy: 40, tx: 400, ty: 40, sourceSide: 'right', targetSide: 'left' });
  });

  it('connects vertically stacked nodes top to bottom', () => {
    const params = getFloatingEdgeParams(card(0, 300), card(0, 0));
    expect(params.sourceSide).toBe('top');
    expect(params.targetSide).toBe('bottom');
  });
});
