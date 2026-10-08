import { center, distance, expect, node, test } from './fixtures';

const packet = (kind: 'tx' | 'block', from: string, to: string) => `[data-testid="packet-${kind}"][data-from="${from}"][data-to="${to}"]`;

test.describe('broadcast animations', () => {
  test('a transaction travels from the issuer to its peer and is relayed onwards', async ({ app }) => {
    // The genesis transaction is issued by Bob one second after start
    const tx = app.locator(packet('tx', 'Bob', 'Alice'));
    await expect(tx).toBeVisible({ timeout: 10_000 });

    const alice = await center(node(app, 'Alice'));
    const first = distance(await center(tx), alice);
    await expect.poll(async () => distance(await center(tx), alice), { timeout: 1_500 }).toBeLessThan(first - 20);
    await expect(tx).toHaveCount(0, { timeout: 3_000 });

    // Alice relays to Frank and Grace, but not back to Bob
    await expect(app.locator(packet('tx', 'Alice', 'Frank'))).toBeVisible({ timeout: 5_000 });
    await expect(app.locator(packet('tx', 'Alice', 'Grace'))).toBeVisible();
    await expect(app.locator(packet('tx', 'Alice', 'Bob'))).toHaveCount(0);
  });

  test('packets follow an edge while its node is dragged', async ({ app }) => {
    const tx = app.locator(packet('tx', 'Bob', 'Alice'));
    await expect(tx).toBeVisible({ timeout: 10_000 });

    const handle = await center(node(app, 'Alice').locator('.sml-node__balance'));
    await app.mouse.move(handle.x, handle.y);
    await app.mouse.down();
    await app.mouse.move(handle.x + 250, handle.y + 150, { steps: 5 });
    await app.mouse.up();

    const moved = await center(node(app, 'Alice'));
    await expect.poll(async () => {
      if (!(await tx.count())) return 0;
      return distance(await center(tx), moved);
    }, { timeout: 2_500 }).toBeLessThan(120);
  });

  test('mining shows the mining state and broadcasts the block', async ({ app }) => {
    await expect(app.locator(packet('tx', 'Bob', 'Alice'))).toBeVisible({ timeout: 10_000 });
    await node(app, 'Bob').click();
    await app.getByTestId('editor-mine').click();

    await expect(app.locator(packet('block', 'Bob', 'Alice'))).toBeVisible({ timeout: 20_000 });
    await expect(app.locator(packet('block', 'Bob', 'Alice')).locator('img'))
      .toHaveJSProperty('complete', true);
    await expect(node(app, 'Bob')).not.toHaveClass(/sml-node--mining/);
    await expect(node(app, 'Bob').getByTestId('node-balance')).toHaveText('Balance: 100');
    await expect(app.getByTestId('explorer-block')).toHaveCount(2);
  });

  test('a rejected transaction flashes the issuing node', async ({ app }) => {
    await node(app, 'Dave').click();
    await app.getByTestId('editor-from').click();
    await app.getByRole('option', { name: 'Dave' }).click();
    await app.getByTestId('editor-to').click();
    await app.getByRole('option', { name: 'Bob' }).click();
    await app.getByTestId('editor-amount').fill('10');
    await app.getByTestId('editor-amount').press('Tab');
    await app.getByTestId('editor-add').click();

    await expect(node(app, 'Dave')).toHaveClass(/sml-node--error/);
    await expect(app.getByText('Transaction rejected', { exact: true })).toBeVisible();
    await expect(app.locator('[data-testid="console-entry"][data-type="warn"]').filter({ hasText: 'Insufficient balance' })).toBeVisible();
    await expect(node(app, 'Dave')).not.toHaveClass(/sml-node--error/, { timeout: 3_000 });
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('packets are shown at their destination instead of travelling', async ({ app }) => {
    const tx = app.locator(packet('tx', 'Bob', 'Alice'));
    await expect(tx).toBeVisible({ timeout: 10_000 });
    const alice = await center(node(app, 'Alice'));
    expect(distance(await center(tx), alice)).toBeLessThan(120);
  });
});
