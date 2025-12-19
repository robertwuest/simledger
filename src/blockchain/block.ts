import { SHA256 } from 'crypto-js';
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
    this.hash = Block.generateHash(this);
  }

  /**
   * Generates the SHA256 hash for a block
   * 
   * The hash is computed from all block data concatenated together:
   * previousHash + length + timestamp + transactions + rewardAddress + nonce
   * 
   * This makes the block tamper-evident - any change invalidates the hash.
   * The nonce is included to support proof-of-work mining.
   * 
   * @static
   * @param {Block} self - The block to hash
   * @returns {string} The SHA256 hash as a hex string
   */
  static generateHash(self: Block) {
    return SHA256(
      self.previousHash +
      self.length +
      self.timestamp +
      JSON.stringify(self.transactions) +
      self.rewardAddress +
      self.nonce,
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
   * @static
   * @param {Block} self - The block to mine
   * @param {number} difficulty - Number of leading zeros required in the hash
   * @param {Function} callback - Called with mined block data when complete
   */
  static mineBlock(self: Block, difficulty: number, callback: any) {
    const worker = new Worker('js/mining.js');
    // Only send serializable data
    worker.postMessage({
      block: {
        previousHash: self.previousHash,
        length: self.length,
        timestamp: self.timestamp,
        transactions: self.transactions.map(tx => ({ ...tx })),
        rewardAddress: self.rewardAddress,
        previousRewardAddress: self.previousRewardAddress,
        nonce: self.nonce,
        hash: self.hash
      },
      difficulty,
    });
    worker.addEventListener('message', (e) => {
      console.log(`%cBlock mined: ${e.data.hash}`, 'color: #00FF00');
      callback(e.data);
    });
  }

  /**
   * Validates all transactions within a block
   * 
   * Comprehensive validation including:
   * - Exactly one reward transaction from the network ('_' fromAddress)
   * - Reward goes to the previous miner (previousRewardAddress)
   * - Reward amount matches the blockchain's miningReward
   * - All regular transactions have valid signatures
   * - No address spends more than they have (prevents double-spending)
   * - At least one regular transaction exists (blocks can't be empty except genesis)
   * 
   * @static
   * @param {Block} self - The block to validate
   * @param {Blockchain} blockchain - The blockchain for context (rewards, balances)
   * @returns {boolean} True if all transactions are valid, false otherwise
   */
  static hasValidTransactions(self: Block, blockchain: Blockchain) {
    const balances = new Map();
    let hasRewardTransaction = false;
    let hasTransactions = false;
    for (const tx of self.transactions) {
      if (tx.fromAddress === '_') {
        if (hasRewardTransaction) {
          // reject another reward transaction
          blockchain.log('warn', '%cBlock: More than one reward transaction found', 'color: #F0F');
          return false;
        }
        hasRewardTransaction = true;
        if (tx.toAddress === self.previousRewardAddress
          && tx.amount === blockchain.miningReward) {
          // reward transaction valid
          continue;
        } else {
          // fraudulent reward address or invalid mining reward
          blockchain.log('warn', `%cBlock: Fraudulent reward address or invalid mining reward to recipient: ${tx.fromAddress}`, 'color: #F0F');
          return false;
        }
      } else {
        hasTransactions = true;
      }

      if (!Transaction.isValid(tx, blockchain)) {
        blockchain.log('warn', `%cBlock: Transaction invalid or cannot verify signature: ${tx.fromAddress}`, 'color: #F0F');
        // signature check failed
        return false;
      }
      // prevent over spending
      if (!balances.has(tx.fromAddress)) {
        balances.set(tx.fromAddress, blockchain.getBalanceOfAddress(tx.fromAddress, self.length - 2));
      }
      if (balances.get(tx.fromAddress) - tx.amount < 0.0) {
        blockchain.log('warn', `%cBlock: Overspend from address: ${tx.fromAddress}`, 'color: #F0F');
        return false;
      }
      balances.set(tx.fromAddress, balances.get(tx.fromAddress) - tx.amount);
    }
    if (!hasRewardTransaction && blockchain.getLatestBlock().previousHash !== 'genesisHash') {
      blockchain.log('warn', '%cBlock: No reward transaction found', 'color: #F0F');
      return false;
    }
    if (!hasTransactions) {
      blockchain.log('warn', '%cBlock: No transaction found', 'color: #F80');
      return false;
    }
    return true;
  }
}
