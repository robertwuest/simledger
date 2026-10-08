/**
 * Distinct accent color per node, rotating through the hue wheel
 * (mirrors the color generator the previous Raphael renderer used).
 * @param index - Position of the node in the network
 */
export function nodeColor(index: number): string {
  const hue = (Math.max(0, index) * 27) % 360;
  return `hsl(${hue} 70% 50%)`;
}
