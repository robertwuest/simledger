import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blockchain } from '~~/src/blockchain/blockchain';
import { Transaction } from '~~/src/blockchain/transaction';
import SmlCommon from '~~/src/common';
import { FakeWorker } from '../../support/fake-worker';
import { addressOf, genesisKeyPair } from '../../support/fixtures';

/** Queue a signed transfer from the genesis wallet */
function transfer(blockchain: Blockchain, amount: number, recipient = addressOf(SmlCommon.generateKeyPair())) {
  const tx = new Transaction(blockchain.genesisAddress, recipient, amount);
  tx.signTransaction(genesisKeyPair());
  blockchain.addTransaction(tx);
  return recipient;
}

function mine(blockchain: Blockchain, rewardAddress: string) {
  return new Promise<{ block: any; rewardTx: Transaction | null }>((resolve) => {
    blockchain.minePendingTransactions(rewardAddress, (block, rewardTx) => resolve({ block, rewardTx }));
  });
}

describe('Blockchain', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts with a valid genesis block funding the genesis wallet', () => {
    const blockchain = new Blockchain();
    expect(blockchain.getBlockchainLength()).toBe(1);
    expect(blockchain.isChainValid()).toBe(true);
    expect(blockchain.getBalanceOfAddress(blockchain.genesisAddress)).toBe(100);
    expect(addressOf(genesisKeyPair())).toBe(blockchain.genesisAddress);
  });

  it('accepts a signed transaction covered by the balance', () => {
    const blockchain = new Blockchain();
    const tx = new Transaction(blockchain.genesisAddress, addressOf(SmlCommon.generateKeyPair()), 40);
    tx.signTransaction(genesisKeyPair());
    expect(blockchain.addTransaction(tx)).toBe(true);
    expect(blockchain.pendingTransactions).toContain(tx);
  });

  it('rejects a transaction exceeding the balance and logs a warning', () => {
    const blockchain = new Blockchain();
    const logs: [string, string][] = [];
    blockchain.registerLogSubscriber((type, message) => logs.push([type, message]));
    const poor = SmlCommon.generateKeyPair();
    const tx = new Transaction(addressOf(poor), blockchain.genesisAddress, 10);
    tx.signTransaction(poor);
    expect(blockchain.addTransaction(tx)).toBe(false);
    expect(logs.some(([type, message]) => type === 'warn' && message.includes('Insufficient balance'))).toBe(true);
  });

  it('mines pending transactions into a valid block via the worker', async () => {
    const blockchain = new Blockchain();
    const miner = addressOf(SmlCommon.generateKeyPair());
    const recipient = transfer(blockchain, 25);

    const { block, rewardTx } = await mine(blockchain, miner);

    expect(FakeWorker.created.at(-1)?.script).toBe('js/mining.js');
    expect(block.hash.startsWith('0'.repeat(blockchain.difficulty))).toBe(true);
    expect(rewardTx?.toAddress).toBe(miner);
    expect(blockchain.addBlock(block)).toBe(true);
    expect(blockchain.getBlockchainLength()).toBe(2);
    expect(blockchain.isChainValid()).toBe(true);
    expect(blockchain.getBalanceOfAddress(recipient)).toBe(25);
    // 100 - 25 sent + 10 reward for the genesis block's miner (pending since start)
    expect(blockchain.getBalanceOfAddress(blockchain.genesisAddress)).toBe(85);
  });

  it('does not mine a block without regular transactions', async () => {
    const blockchain = new Blockchain();
    blockchain.pendingTransactions = [];
    const { block } = await mine(blockchain, addressOf(SmlCommon.generateKeyPair()));
    expect(block).toBeNull();
  });

  it('detects a tampered chain', async () => {
    const blockchain = new Blockchain();
    transfer(blockchain, 5);
    const { block } = await mine(blockchain, addressOf(SmlCommon.generateKeyPair()));
    blockchain.addBlock(block);
    blockchain.chain[1]!.transactions[0]!.amount = 1_000_000;
    expect(blockchain.isChainValid()).toBe(false);
  });

  it('rejects a block that does not extend the chain', async () => {
    const blockchain = new Blockchain();
    transfer(blockchain, 5);
    const { block } = await mine(blockchain, addressOf(SmlCommon.generateKeyPair()));
    block.previousHash = 'nope';
    expect(blockchain.addBlock(block)).toBe(false);
    expect(blockchain.getBlockchainLength()).toBe(1);
  });
});
