import { center, edge, edgeMidpoint, expect, node, test } from './fixtures';

test.describe('network graph', () => {
  test('renders the default scene with its connections', async ({ app }) => {
    await expect(app.getByTestId('network-node')).toHaveText([/Bob/, /Alice/, /Frank/, /Grace/, /Dave/]);
    await expect(app.locator('.vue-flow__edge')).toHaveCount(4);
    for (const id of ['Alice--Bob', 'Alice--Frank', 'Alice--Grace', 'Frank--Grace']) {
      await expect(edge(app, id)).toHaveCount(1);
    }
    await expect(node(app, 'Bob').getByTestId('node-balance')).toHaveText('Balance: 0');
  });

  test('loads assets from the deployment base path', async ({ app }) => {
    const logo = app.getByAltText('SimLedger Logo');
    await expect(logo).toHaveAttribute('src', '/simledger/img/logo132.png');
    expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test('selecting a node in the graph opens it in explorer and editor', async ({ app }) => {
    await node(app, 'Alice').click();
    await expect(node(app, 'Alice')).toHaveClass(/sml-node--selected/);
    await expect(app.getByTestId('explorer-select')).toContainText('Alice');
    await expect(app.getByTestId('explorer-summary')).toContainText('Alice');
    await expect(app.getByTestId('explorer-ledger')).toContainText('Genesis');
    await expect(app.getByTestId('editor-issuer')).toHaveText('via Alice');
  });

  test('selecting a node in the explorer highlights it in the graph', async ({ app }) => {
    await app.getByTestId('explorer-select').click();
    await app.getByRole('option', { name: 'Frank' }).click();
    await expect(node(app, 'Frank')).toHaveClass(/sml-node--selected/);
    await expect(node(app, 'Alice')).not.toHaveClass(/sml-node--selected/);
  });

  test('connects and disconnects peers through the connection menu', async ({ app }) => {
    await node(app, 'Dave').getByTestId('connection-menu-trigger').click();
    const grace = app.getByRole('menuitemcheckbox', { name: 'Grace' });
    await expect(grace).toHaveAttribute('aria-checked', 'false');
    await grace.click();
    await expect(grace).toHaveAttribute('aria-checked', 'true');
    await expect(edge(app, 'Dave--Grace')).toHaveCount(1);
    await grace.click();
    await expect(edge(app, 'Dave--Grace')).toHaveCount(0);
    await app.keyboard.press('Escape');
    await expect(node(app, 'Dave')).not.toHaveClass(/sml-node--selected/);
  });

  test('connects peers by dragging between node handles', async ({ app }) => {
    await node(app, 'Bob').hover();
    const from = await center(node(app, 'Bob').locator('.vue-flow__handle.source'));
    const to = await center(node(app, 'Dave').locator('.vue-flow__handle.target'));
    await app.mouse.move(from.x, from.y);
    await app.mouse.down();
    await app.mouse.move(to.x, to.y, { steps: 10 });
    await app.mouse.up();
    await expect(edge(app, 'Bob--Dave')).toHaveCount(1);
  });

  test('disconnects peers by deleting the selected edge', async ({ app }) => {
    const point = await edgeMidpoint(app, 'Frank--Grace');
    await app.mouse.click(point.x, point.y);
    await expect(edge(app, 'Frank--Grace')).toHaveClass(/selected/);
    await app.keyboard.press('Backspace');
    await expect(edge(app, 'Frank--Grace')).toHaveCount(0);
    await expect(app.locator('.vue-flow__edge')).toHaveCount(3);
    await expect(app.getByTestId('network-node')).toHaveCount(5);
  });

  test('edges follow dragged nodes', async ({ app }) => {
    const path = edge(app, 'Alice--Bob').locator('path.sml-edge__track');
    const before = await path.getAttribute('d');
    const start = await center(node(app, 'Bob').locator('.sml-node__balance'));
    await app.mouse.move(start.x, start.y);
    await app.mouse.down();
    await app.mouse.move(start.x + 120, start.y + 60, { steps: 8 });
    await app.mouse.up();
    await expect(path).not.toHaveAttribute('d', before!);
  });

  test('toolbar adds nodes, pauses the simulation and controls zoom', async ({ app }) => {
    await app.getByTestId('toolbar-add-node').click();
    await expect(app.getByTestId('network-node')).toHaveCount(6);
    await expect(node(app, 'Carol')).toHaveClass(/sml-node--selected/);

    const toggle = app.getByTestId('toolbar-simulation');
    await expect(toggle).toHaveAttribute('aria-label', 'Pause simulation');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', 'Resume simulation');

    const transform = () => app.locator('.vue-flow__transformationpane').getAttribute('style');
    const before = await transform();
    await app.locator('.vue-flow__controls-zoomin').click();
    await expect.poll(transform).not.toBe(before);
  });

  test('switches between dark and light mode', async ({ app }) => {
    const html = app.locator('html');
    const initial = (await html.getAttribute('class')) ?? '';
    await app.getByTestId('color-mode-toggle').click();
    await expect(html).not.toHaveClass(initial.includes('dark') ? /dark/ : /^$/);
  });
});
