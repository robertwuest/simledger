import { SHA256 } from 'crypto-js';
import SmlCommon from '../common';

/**
 * Transaction class
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 */
export class Transaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: any;

  constructor(fromAddress: string, toAddress: string, amount: number) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
  }

  /**
   * Generate hash for transaction
   */
  static generateHash(self: Transaction) {
    return SmlCommon.HexToBase58(SHA256(self.fromAddress + self.toAddress + self.amount).toString());
  }

  /**
   * Sign the transaction
   */
  static signTransaction(self: Transaction, signingKey: any) {
    if (SmlCommon.HexToBase58(signingKey.getPublic(true, 'hex')) !== self.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }

    const hashTx = Transaction.generateHash(self);
    const sig = signingKey.sign(hashTx, 'base64');
    self.signature = sig.toDER('hex');
  }

  /**
   * Validate transaction
   */
  static isValid(self: Transaction) {
    if (self.fromAddress === '_') return true;

    if (!self.signature || self.signature.length === 0) {
      console.warn('TX: No signature in this transaction');
      return false;
    }

    const publicKey = SmlCommon.curve.keyFromPublic(SmlCommon.Base58ToHex(self.fromAddress), 'hex');
    return publicKey.verify(Transaction.generateHash(self), self.signature);
  }
}
