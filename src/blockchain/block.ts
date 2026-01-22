import SHA256 from 'crypto-js/sha256';
import { Transaction } from './transaction'; // eslint-disable-line
import { Blockchain } from './blockchain'; // eslint-disable-line

/**
 * Class representing a block within the blockchain
 *
 * A block is an immutable record containing:
 * - A timestamp of when it was created
 * - A list of transactions
 * - A reference to the previous block (previousHash)
 * - A nonce for proof-of-work mining
 * - The miner's reward address
 *
 * The block's hash is derived from all its contents, making it tamper-evident.
 * If any data in the block changes, the hash will no longer match the stored value.
 *
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 *
 * @class Block
 * @property {string} previousHash - Hash of the previous block in the chain
 * @property {string} timestamp - Creation time as a string timestamp
 * @property {number} length - Block index/position in the chain
 * @property {Transaction[]} transactions - Array of transactions in this block
 * @property {string} previousRewardAddress - Address that mined the previous block
 * @property {string} rewardAddress - Address to receive the mining reward
 * @property {string} hash - The SHA256 hash of this block's data
 * @property {number} nonce - Number used once in proof-of-work mining
 */
export class Block {
  previousHash: string;
  timestamp: string;
  length: number;
  transactions: Transaction[];
  previousRewardAddress: string;
  rewardAddress: string;
  hash: string;
  nonce: number;

  /**
   * Creates a new Block instance
   *
   * @param {number} length - Position of this block in the chain
   * @param {string} timestamp - Creation timestamp
   * @param {Transaction[]} transactions - Transactions to include in this block
   * @param {string} rewardAddress - Address receiving the mining reward
   * @param {string} previousRewardAddress - Address that mined the previous block
   * @param {string} [previousHash=''] - Hash of the previous block (empty for genesis)
   */
  constructor(
    length: number,
    timestamp: string,
    transactions: Transaction[],
    rewardAddress: string,
    previousRewardAddress: string,
    previousHash = '',
  ) {
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.length = length;
    this.transactions = transactions;
    this.nonce = 0;
    this.rewardAddress = rewardAddress;
    this.previousRewardAddress = previousRewardAddress;
    this.hash = this.generateHash();
  }

  /**
   * Generates the SHA256 hash for this block using transaction hashes
   *
   * The hash is computed from:
   * - previousHash + length + timestamp + transactionHashes + rewardAddress + nonce
   *
   * Using transaction hashes instead of JSON.stringify ensures:
   * - Deterministic ordering (same transactions = same hash)
   * - Better performance (hashes pre-computed)
   * - Consistency (block hash depends on transaction hashes)
   *
   * This makes the block tamper-evident - any change invalidates the hash.
   * The nonce is included to support proof-of-work mining.
   *
   * @returns {string} The SHA256 hash as a hex string
   */
  generateHash(): string {
    const transactionHashes = this.transactions
      .map(tx => tx.generateHash())
      .join('');

    return SHA256(
      this.previousHash +
      this.length +
      this.timestamp +
      transactionHashes +
      this.rewardAddress +
      this.nonce,
    ).toString();
  }

  /**
   * Mines the block by finding a valid proof-of-work nonce
   *
   * Proof-of-work mechanism: incrementally increase the nonce until the block's hash
   * has the required number of leading zeros (specified by difficulty parameter).
   *
   * For example, difficulty=1 requires 1 leading zero (hash starts with '0'),
   * difficulty=2 requires 2 leading zeros, etc.
   *
   * Mining is performed in a Web Worker to prevent blocking the UI thread.
   * Sends the block data to the worker and listens for completion.
   *
   * @param {number} difficulty - Number of leading zeros required in the hash
   * @param {Function} callback - Called with mined block data when complete
   */
  mineBlock(difficulty: number, callback: (result: { nonce: number; hash: string } | null) => void): void {
    const worker = new Worker('js/mining.js');

    // Set timeout to prevent infinite mining
    const timeout = setTimeout(() => {
      worker.terminate();
      console.error('Mining timeout after 5 minutes');
      callback(null);
    }, 300000);

    // Only send serializable data
    worker.postMessage({
      block: {
        previousHash: this.previousHash,
        length: this.length,
        timestamp: this.timestamp,
        transactions: this.transactions.map(tx => ({
          fromAddress: tx.fromAddress,
          toAddress: tx.toAddress,
          amount: tx.amount,
          nonce: tx.nonce,
          signature: tx.signature,
          timestamp: tx.timestamp,
        })),
        rewardAddress: this.rewardAddress,
        previousRewardAddress: this.previousRewardAddress,
        nonce: this.nonce,
        hash: this.hash
      },
      difficulty,
    });

    worker.addEventListener('message', (e) => {
      clearTimeout(timeout);
      console.log(`%cBlock mined: ${e.data.hash}`, 'color: #00FF00');
      worker.terminate();
      callback(e.data);
    });

    worker.addEventListener('error', (error) => {
      clearTimeout(timeout);
      console.error('Mining worker error:', error);
      worker.terminate();
      callback(null);
    });
  }

  /**
   * Validates all transactions within this block
   *
   * Comprehensive validation including:
   * - Exactly one reward transaction from the network ('_' fromAddress)
   * - Reward goes to the previous miner (previousRewardAddress)
   * - Reward amount matches the blockchain's miningReward
   * - All regular transactions have valid signatures
   * - No address spends more than they have (prevents double-spending)
   * - At least one regular transaction exists (blocks can't be empty except genesis)
   *
   * @param {Blockchain} blockchain - The blockchain for context (rewards, balances)
   * @returns {boolean} True if all transactions are valid, false otherwise
   */
  hasValidTransactions(blockchain: Blockchain): boolean {
    const tempBalances = new Map<string, number>();
    let hasRewardTransaction = false;
    let hasTransactions = false;

    for (const tx of this.transactions) {
      if (tx.fromAddress === '_') {
        if (hasRewardTransaction) {
          blockchain.log('warn', '%c📦: More than one reward transaction found', 'color: #F0F');
          return false;
        }
        hasRewardTransaction = true;

        if (tx.toAddress === this.previousRewardAddress
          && tx.amount === blockchain.miningReward) {
          // reward transaction valid
          continue;
        } else {
          // fraudulent reward address or invalid mining reward
          blockchain.log('warn', `%c📦: Fraudulent reward address or invalid mining reward to recipient: ${tx.toAddress}`, 'color: #F0F');
          return false;
        }
      } else {
        hasTransactions = true;
      }

      if (!tx.isValid(blockchain)) {
        blockchain.log('warn', `%c📦: Transaction invalid or cannot verify signature: ${tx.fromAddress}`, 'color: #F0F');
        // signature check failed
        return false;
      }

      // prevent over spending - O(1) with state manager
      if (!tempBalances.has(tx.fromAddress)) {
        // Get balance from previous block
        const prevBlockIndex = this.length - 2;
        const balance = prevBlockIndex >= 0
          ? blockchain.getBalanceOfAddress(tx.fromAddress, prevBlockIndex)
          : 0;
        tempBalances.set(tx.fromAddress, balance);
      }

      const currentBalance = tempBalances.get(tx.fromAddress)!;
      if (currentBalance - tx.amount < 0.0) {
        blockchain.log('warn', `%c📦: Overspend from address: ${tx.fromAddress}`, 'color: #F0F');
        return false;
      }
      tempBalances.set(tx.fromAddress, currentBalance - tx.amount);
    }

    if (!hasRewardTransaction && blockchain.getLatestBlock().previousHash !== 'genesisHash') {
      blockchain.log('warn', '%c📦: No reward transaction found', 'color: #F0F');
      return false;
    }
    if (!hasTransactions) {
      blockchain.log('warn', '%c📦: No transaction found', 'color: #F80');
      return false;
    }
    return true;
  }
}
