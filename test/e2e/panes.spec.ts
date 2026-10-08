import { expect, node, test } from './fixtures';

test.describe('explorer and editor', () => {
  test('show empty states until a node is selected', async ({ app }) => {
    await expect(app.getByText('No node selected')).toHaveCount(2);
    await node(app, 'Bob').click();
    await expect(app.getByText('No node selected')).toHaveCount(0);
    await expect(app.getByTestId('explorer-stat-balance')).toHaveText('0');
  });

  test('explore blocks and sections of the selected node', async ({ app }) => {
    await node(app, 'Bob').click();
    const block = app.getByTestId('explorer-block').first();
    await block.click();
    await expect(block).toHaveAttribute('aria-expanded', 'true');
    await expect(app.getByTestId('explorer-block-details')).toContainText('genesisHash');

    const ledger = app.getByRole('button', { name: /Ledger/ });
    await ledger.click();
    await expect(app.getByTestId('explorer-ledger')).toBeVisible();
    await expect(app.getByTestId('explorer-ledger')).toContainText('Mining reward');
  });

  test('editor validates input, warns about the balance and sends the transaction', async ({ app }) => {
    await node(app, 'Alice').click();
    await expect(app.getByTestId('editor-from')).toContainText('Alice');

    await app.getByTestId('editor-add').click();
    await expect(app.getByText('Choose a recipient')).toBeVisible();

    await app.getByTestId('editor-to').click();
    await app.getByRole('option', { name: 'Frank' }).click();
    await app.getByTestId('editor-amount').fill('5');
    await app.getByTestId('editor-amount').press('Tab');
    await expect(app.getByTestId('editor-balance-warning')).toContainText("Exceeds Alice's balance of 0");

    await app.getByTestId('editor-swap').click();
    await expect(app.getByTestId('editor-from')).toContainText('Frank');
    await expect(app.getByTestId('editor-to')).toContainText('Alice');

    await app.getByTestId('editor-add').click();
    await expect(app.getByText('Transaction rejected', { exact: true })).toBeVisible();
  });

  test('mining is enabled by pending transfers and validation is shown inline', async ({ app }) => {
    await node(app, 'Dave').click();
    await expect(app.getByTestId('editor-mine')).toBeDisabled();
    await expect(app.getByTestId('editor-mine-hint')).toBeVisible();

    await app.getByTestId('editor-validate').click();
    await expect(app.getByTestId('editor-validation')).toContainText('Chain valid');

    // Bob receives the genesis transaction and can mine it
    await node(app, 'Bob').click();
    await expect(app.getByTestId('editor-validation')).toHaveCount(0);
    await expect(app.getByTestId('editor-mine')).toBeEnabled({ timeout: 5_000 });
  });
});
