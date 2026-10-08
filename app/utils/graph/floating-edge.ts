/**
 * Floating edge geometry
 *
 * Edges attach to the border of the node cards at the point facing the other node
 * (instead of fixed handles), similar to the previous Raphael connection routing.
 */

export type Side = 'top' | 'right' | 'bottom' | 'left';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingEdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourceSide: Side;
  targetSide: Side;
}

/**
 * Point where the line between the centers of two rectangles leaves `from`
 * @param from - Rectangle the line starts in
 * @param to - Rectangle the line points to
 */
export function getRectIntersection(from: Rect, to: Rect): { x: number; y: number } {
  const w = from.width / 2;
  const h = from.height / 2;
  const cx = from.x + w;
  const cy = from.y + h;
  const tx = to.x + to.width / 2;
  const ty = to.y + to.height / 2;
  if (w === 0 || h === 0 || (cx === tx && cy === ty)) {
    return { x: cx, y: cy };
  }
  const xx1 = (tx - cx) / (2 * w) - (ty - cy) / (2 * h);
  const yy1 = (tx - cx) / (2 * w) + (ty - cy) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return {
    x: w * (xx3 + yy3) + cx,
    y: h * (-xx3 + yy3) + cy,
  };
}

/**
 * Side of a rectangle a border point lies on
 * @param rect - The rectangle
 * @param point - Point on the rectangle border
 */
export function getSide(rect: Rect, point: { x: number; y: number }): Side {
  const px = Math.round(point.x);
  const py = Math.round(point.y);
  if (px <= Math.round(rect.x) + 1) return 'left';
  if (px >= Math.round(rect.x + rect.width) - 1) return 'right';
  if (py <= Math.round(rect.y) + 1) return 'top';
  if (py >= Math.round(rect.y + rect.height) - 1) return 'bottom';
  return 'top';
}

/**
 * Start/end coordinates and sides for an edge between two node rectangles
 * @param source - Source node rectangle
 * @param target - Target node rectangle
 */
export function getFloatingEdgeParams(source: Rect, target: Rect): FloatingEdgeParams {
  const s = getRectIntersection(source, target);
  const t = getRectIntersection(target, source);
  return {
    sx: s.x,
    sy: s.y,
    tx: t.x,
    ty: t.y,
    sourceSide: getSide(source, s),
    targetSide: getSide(target, t),
  };
}
