import SHA256 from 'crypto-js/sha256';
import SmlCommon from '../common';
import { Blockchain } from "./blockchain"; // eslint-disable-line

/**
 * Transaction class
 * 
 * Represents a transfer of value from one address to another.
 * Transactions are signed with the sender's private key to prove ownership.
 * 
 * Each transaction contains:
 * - Sender and recipient addresses (Base58 encoded public keys)
 * - Amount of currency to transfer
 * - A unique nonce (prevents replay attacks)
 * - A cryptographic signature (proves sender authorized the transaction)
 * 
 * Special transaction: fromAddress = '_' represents a mining reward (no signature needed)
 * 
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 * 
 * @class Transaction
 * @property {string} fromAddress - Sender's address (Base58 encoded public key, or '_' for rewards)
 * @property {string} toAddress - Recipient's address (Base58 encoded public key)
 * @property {number} amount - Amount of currency to transfer
 * @property {any} signature - ECDSA signature proving sender authorized the transaction
 */
export class Transaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: any;
  private nonce: string;

  /**
   * Creates a new Transaction
   * 
   * @param {string} fromAddress - Sender's address (Base58) or '_' for mining rewards
   * @param {string} toAddress - Recipient's address (Base58)
   * @param {number} amount - Amount to transfer
   * @param {string} [nonce] - Optional nonce for testing (auto-generated if not provided)
   */
  constructor(fromAddress: string, toAddress: string, amount: number, nonce?: string) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = typeof amount === 'string' ? parseFloat(amount) : amount;
    this.nonce = typeof nonce !== 'undefined' ? nonce : SmlCommon.generateNonce();
  }

  /**
   * Generates a unique hash identifier for this transaction
   * 
   * Hash is computed from all transaction data including the nonce:
   * SHA256(fromAddress + toAddress + amount + nonce)
   * 
   * The nonce ensures two identical transactions have different hashes.
   * Result is Base58 encoded for consistency with address format.
   * 
   * @static
   * @param {Transaction} self - The transaction to hash
   * @returns {string} Base58 encoded transaction hash
   */
  static generateHash(self: Transaction) {
    return SmlCommon.HexToBase58(SHA256(self.fromAddress + self.toAddress + self.amount + self.nonce).toString());
  }

  /**
   * Signs this transaction with the sender's private key
   * 
   * Creates an ECDSA signature using secp256k1 elliptic curve.
   * The signature proves that the owner of the address authorized this transaction.
   * 
   * Validation: The signing key's public key (address) must match fromAddress.
   * This prevents one wallet from signing transactions for another wallet.
   * 
   * @static
   * @param {Transaction} self - The transaction to sign
   * @param {any} signingKey - Private key object (from elliptic library)
   * @throws {Error} If signing key's public key doesn't match fromAddress
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
   * Validates this transaction
   * 
   * Checks:
   * - Mining reward transactions (fromAddress = '_') are automatically valid
   * - Sender and recipient are different addresses
   * - Transaction has a valid signature
   * - Signature is mathematically valid using sender's public key
   * 
   * Note: Balance validation is done at the blockchain level, not here.
   * 
   * @static
   * @param {Transaction} self - The transaction to validate
   * @param {Blockchain} blockchain - The blockchain (for logging)
   * @returns {boolean} True if transaction is valid, false otherwise
   */
  static isValid(self: Transaction, blockchain: Blockchain) {
    // check for payout
    if (self.fromAddress === '_') return true;

    // Check sender and recipient
    if (self.fromAddress === self.toAddress) {
      blockchain.log('warn', '%c⇄: Sender address is same as receiver', 'color: #F0F');
      return false;
    }

    // check signature
    if (!self.signature || self.signature.length === 0) {
      blockchain.log('warn', '%c⇄: No signature found in this transaction', 'color: #F0F');
      return false;
    }

    const publicKey = SmlCommon.curve.keyFromPublic(SmlCommon.Base58ToHex(self.fromAddress), 'hex');
    const verified = publicKey.verify(Transaction.generateHash(self), self.signature);

    if (!verified) {
      blockchain.log('warn', '%c⇄: Signature did not verify', 'color: #F0F');
    }

    return verified;
  }
}
