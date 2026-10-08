import type { Page } from '@playwright/test';
import { expect, edge, node, test } from './fixtures';

/** Toggle the connection between two nodes through the connection menu */
async function toggleConnection(app: Page, from: string, to: string) {
  await node(app, from).getByTestId('connection-menu-trigger').click();
  await app.getByRole('menuitemcheckbox', { name: to }).click();
  await app.keyboard.press('Escape');
}

async function mine(app: Page, id: string) {
  await node(app, id).click();
  await expect(app.getByTestId('editor-mine')).toBeEnabled({ timeout: 10_000 });
  await app.getByTestId('editor-mine').click();
}

test.describe('chain conflicts', () => {
  test('nodes mining on a split network report the fork and resolve it by retaining or adopting', async ({ app }) => {
    test.setTimeout(120_000);
    const console = app.getByTestId('console-entry');

    // Alice relays the genesis transaction from Bob, then the network splits
    await node(app, 'Alice').click();
    await expect(app.getByTestId('editor-mine')).toBeEnabled({ timeout: 10_000 });
    await toggleConnection(app, 'Bob', 'Alice');
    await expect(edge(app, 'Alice--Bob')).toHaveCount(0);

    // Both sides mine the same transaction into different blocks
    await mine(app, 'Bob');
    await mine(app, 'Alice');
    for (const id of ['Bob', 'Alice']) {
      await expect(node(app, id)).not.toHaveClass(/sml-node--mining/, { timeout: 30_000 });
    }

    // Reconnected, the chains have the same length: no longest-chain decision
    await toggleConnection(app, 'Bob', 'Alice');
    await expect(edge(app, 'Alice--Bob').locator('path.sml-edge--conflict')).toHaveCount(1);
    await expect(node(app, 'Bob').getByTestId('node-conflict')).toBeVisible();
    await expect(node(app, 'Alice').getByTestId('node-conflict')).toBeVisible();
    await expect(console.filter({ hasText: 'Chain conflict with Alice: chains fork at block #1 (both 2 blocks)' })).toHaveCount(1);

    // Alice keeps her chain, the edge stays marked until Bob decided as well
    await node(app, 'Alice').click();
    const aliceConflict = app.getByTestId('explorer-conflict');
    await expect(aliceConflict).toContainText('Chain conflict with Bob');
    await expect(app.getByTestId('explorer-block-forked')).toHaveCount(1);
    await aliceConflict.getByTestId('explorer-conflict-retain').click();
    await expect(aliceConflict).toContainText("Keeping own chain over Bob's");
    await expect(node(app, 'Alice').getByTestId('node-conflict')).toHaveCount(0);
    await expect(console.filter({ hasText: "Retained own chain (2 blocks), ignoring Bob's conflicting chain" })).toHaveCount(1);
    await expect(edge(app, 'Alice--Bob').locator('path.sml-edge--conflict')).toHaveCount(1);

    // Bob adopts Alice's chain: the fork is gone on both sides
    await node(app, 'Bob').click();
    await app.getByTestId('explorer-conflict-adopt').click();
    await expect(app.getByText('Chain adopted', { exact: true })).toBeVisible();
    await expect(app.getByTestId('explorer-conflict')).toHaveCount(0);
    await expect(console.filter({ hasText: "Adopted Alice's chain: 2 → 2 blocks, fork at block #1, 1 own block discarded" })).toHaveCount(1);
    await expect(edge(app, 'Alice--Bob').locator('path.sml-edge--conflict')).toHaveCount(0);
    await expect(app.locator('[data-testid="node-conflict"]')).toHaveCount(0);
    await expect(node(app, 'Bob').getByTestId('node-balance')).toHaveText('Balance: 100');
  });
});
