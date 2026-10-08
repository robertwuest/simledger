import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * Page fixture that fails the test on uncaught errors and console errors
 */
export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    // Failed requests are reported with their URL by the response listener below
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text());
    });
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto('./');
    await expect(page.getByTestId('network-node')).toHaveCount(5);
    await use(page);
    expect(errors, 'console errors').toEqual([]);
  },
});

export { expect };

export const node = (page: Page, id: string) => page.locator(`[data-testid="network-node"][data-node-id="${id}"]`);
export const edge = (page: Page, id: string) => page.locator(`.vue-flow__edge[data-id="${id}"]`);

/** Center of an element's bounding box in page coordinates */
export async function center(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Screen coordinates of the midpoint along an edge path (a curve's bounding box center may miss it) */
export async function edgeMidpoint(page: Page, id: string) {
  return edge(page, id).locator('path.sml-edge__track').evaluate((path: SVGPathElement) => {
    const point = path.getPointAtLength(path.getTotalLength() / 2);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM()!);
    return { x: screen.x, y: screen.y };
  });
}
