import { SHA256 } from 'crypto-js';
import SmlCommon from '../common';
import { Blockchain } from "./blockchain"; // eslint-disable-line

/**
 * Transaction class
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 */
export class Transaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: any;
  private nonce: string;

  constructor(fromAddress: string, toAddress: string, amount: number, nonce?: string) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = typeof amount === 'string' ? parseFloat(amount) : amount;
    this.nonce = typeof nonce !== 'undefined' ? nonce : SmlCommon.generateNonce();
  }

  /**
   * Generate hash for transaction
   */
  static generateHash(self: Transaction) {
    return SmlCommon.HexToBase58(SHA256(self.fromAddress + self.toAddress + self.amount + self.nonce).toString());
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
  static isValid(self: Transaction, blockchain: Blockchain) {
    // check for payout
    if (self.fromAddress === '_') return true;

    // Check sender and recipient
    if (self.fromAddress === self.toAddress) {
      blockchain.log('warn', '%cTX: Sender address is same as receiver', 'color: #F0F');
      return false;
    }

    // check signature
    if (!self.signature || self.signature.length === 0) {
      blockchain.log('warn', '%cTX: No signature found in this transaction', 'color: #F0F');
      return false;
    }

    const publicKey = SmlCommon.curve.keyFromPublic(SmlCommon.Base58ToHex(self.fromAddress), 'hex');
    const verified = publicKey.verify(Transaction.generateHash(self), self.signature);

    if (!verified) {
      blockchain.log('warn', '%cTX: Signature did not verify', 'color: #F0F');
    }

    return verified;
  }
}
