import SHA256 from 'crypto-js/sha256';
import SmlCommon from '../common';
import type { Blockchain } from "./blockchain"; // eslint-disable-line

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
 * - A timestamp for ordering and tracking
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
 * @property {string} signature - ECDSA signature proving sender authorized the transaction
 * @property {string} nonce - Unique nonce for replay attack prevention
 * @property {number} timestamp - Unix timestamp in milliseconds
 */
export class Transaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: string;
  nonce: string;
  timestamp: number;

  /**
   * Creates a new Transaction
   *
   * @param {string} fromAddress - Sender's address (Base58) or '_' for mining rewards
   * @param {string} toAddress - Recipient's address (Base58)
   * @param {number} amount - Amount to transfer
   * @param {string} [nonce] - Optional nonce for testing (auto-generated if not provided)
   * @param {number} [timestamp] - Optional timestamp for deterministic creation (e.g., genesis block)
   */
  constructor(fromAddress: string, toAddress: string, amount: number, nonce?: string, timestamp?: number) {
    // Validate amount
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new Error('Amount must be a finite number');
    }
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.nonce = nonce ?? Transaction.generateNonce();
    this.timestamp = timestamp ?? Date.now();
    this.signature = '';
  }

  /**
   * Generates a unique hash identifier for this transaction
   *
   * Hash is computed from all transaction data including the nonce and timestamp:
   * SHA256(fromAddress + toAddress + amount + nonce + timestamp)
   *
   * The nonce ensures two identical transactions have different hashes.
   * Returns hex string for consistency with block hashes.
   *
   * @returns {string} Hex encoded transaction hash
   */
  generateHash(): string {
    return SHA256(
      this.fromAddress +
      this.toAddress +
      this.amount +
      this.nonce +
      this.timestamp
    ).toString();
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
   * @param {any} signingKey - Private key object (from elliptic library)
   * @throws {Error} If signing key's public key doesn't match fromAddress
   */
  signTransaction(signingKey: any): void {
    if (SmlCommon.HexToBase58(signingKey.getPublic(true, 'hex')) !== this.fromAddress) {
      throw new Error('Cannot sign transactions for other wallets');
    }

    const hashTx = this.generateHash();
    const sig = signingKey.sign(hashTx);
    this.signature = sig.toDER('hex');
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
   * @param {Blockchain} blockchain - The blockchain (for logging)
   * @returns {boolean} True if transaction is valid, false otherwise
   */
  isValid(blockchain: Blockchain): boolean {
    // check for payout
    if (this.fromAddress === '_') return true;

    // Check sender and recipient
    if (this.fromAddress === this.toAddress) {
      blockchain.log('warn', '%c⇄: Sender address is same as receiver', 'color: #F0F');
      return false;
    }

    // check signature
    if (!this.signature || this.signature.length === 0) {
      blockchain.log('warn', '%c⇄: No signature found in this transaction', 'color: #F0F');
      return false;
    }

    try {
      const publicKey = SmlCommon.curve.keyFromPublic(SmlCommon.Base58ToHex(this.fromAddress), 'hex');
      const verified = publicKey.verify(this.generateHash(), this.signature);

      if (!verified) {
        blockchain.log('warn', '%c⇄: Signature did not verify', 'color: #F0F');
      }

      return verified;
    } catch (error: any) {
      blockchain.log('error', `%c⇄: Error verifying signature: ${error.message}`, 'color: #F00');
      return false;
    }
  }

  /**
   * Generate cryptographically stronger nonce
   *
   * Uses timestamp + random for better uniqueness than the original 4-character version.
   * Format: timestamp(base36) + random(base36) = ~20 characters
   *
   * @static
   * @returns {string} Unique nonce string
   */
  static generateNonce(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
}
