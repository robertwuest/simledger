import { describe, expect, it } from 'vitest';
import { Transaction } from '~~/src/blockchain/transaction';
import { Blockchain } from '~~/src/blockchain/blockchain';
import SmlCommon from '~~/src/common';
import { addressOf, genesisKeyPair } from '../../support/fixtures';

describe('Transaction', () => {
  const blockchain = new Blockchain();
  const key = genesisKeyPair();
  const from = addressOf(key);
  const to = addressOf(SmlCommon.generateKeyPair());

  it('is valid once signed by the sender', () => {
    const tx = new Transaction(from, to, 10);
    tx.signTransaction(key);
    expect(tx.isValid(blockchain)).toBe(true);
  });

  it('refuses to be signed for another wallet', () => {
    const tx = new Transaction(to, from, 10);
    expect(() => tx.signTransaction(key)).toThrow('Cannot sign transactions for other wallets');
  });

  it('is invalid without a signature', () => {
    expect(new Transaction(from, to, 10).isValid(blockchain)).toBe(false);
  });

  it('detects tampering after signing', () => {
    const tx = new Transaction(from, to, 10);
    tx.signTransaction(key);
    tx.amount = 1000;
    expect(tx.isValid(blockchain)).toBe(false);
  });

  it('rejects sending to oneself', () => {
    const tx = new Transaction(from, from, 10);
    tx.signTransaction(key);
    expect(tx.isValid(blockchain)).toBe(false);
  });

  it('accepts mining rewards without a signature', () => {
    expect(new Transaction('_', to, 10).isValid(blockchain)).toBe(true);
  });

  it('rejects negative and non-numeric amounts', () => {
    expect(() => new Transaction(from, to, -1)).toThrow();
    expect(() => new Transaction(from, to, Number.NaN)).toThrow();
  });
});
