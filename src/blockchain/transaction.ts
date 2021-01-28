import SmlCommon from "@/common";
import { SHA256 } from "crypto-js";

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
  generateHash() {
    return SmlCommon.HexToBase58(SHA256(this.fromAddress + this.toAddress + this.amount).toString());
  }

  /**
   * Sign the transaction
   */
  signTransaction(signingKey: any) {
    if (SmlCommon.HexToBase58(signingKey.getPublic(true,'hex')) !== this.fromAddress) {
      throw new Error('You cannot sign transactions for other wallets!');
    }

    const hashTx = this.generateHash();
    const sig = signingKey.sign(hashTx, 'base64');
    this.signature = sig.toDER('hex');
  }

  /**
   * Validate transaction
   */
  isValid() {
    if (this.fromAddress === '_') return true;

    if (!this.signature || this.signature.length === 0) {
      console.warn('TX: No signature in this transaction');
      return false;
    }

    const publicKey = SmlCommon.curve.keyFromPublic(SmlCommon.Base58ToHex(this.fromAddress), 'hex');
    return publicKey.verify(this.generateHash(), this.signature);
  }
}
