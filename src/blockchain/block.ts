import { SHA256 } from 'crypto-js';
import { Transaction } from './transaction';
import { Blockchain } from './blockchain'; // eslint-disable-line

/**
 * Class representing a block within the blockchain
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
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
   * Generate hash out of previous hash and timestamp
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
   * Keep changing the nonce until the hash of our block starts with enough zero's.
   */
  static mineBlock(self: Block, difficulty: number, callback: any) {
    const worker = new Worker('js/mining.js');
    worker.postMessage({
      block: self,
      difficulty,
    });
    worker.addEventListener('message', (e) => {
      console.log(`%cBlock mined: ${e.data.hash}`, 'color: #00FF00');
      callback(e.data);
    });
  }

  /**
   * Block has valid transactions
   */
  static hasValidTransactions(self: Block, blockchain: Blockchain) {
    const balances = new Map();
    let hasRewardTransaction = false;
    for (const tx of self.transactions) {
      if (tx.fromAddress === '_') {
        if (hasRewardTransaction) {
          // reject another reward transaction
          console.warn('%cBlock: More than one reward transaction found', 'color: #F0F');
          return false;
        }
        hasRewardTransaction = true;
        if (tx.toAddress === self.previousRewardAddress
          && tx.amount === blockchain.miningReward) {
          // reward transaction valid
          continue;
        } else {
          // fraudulent reward address or invalid mining reward
          console.warn(`%cBlock: Fraudulent reward address or invalid mining reward to recipient: ${tx.fromAddress}`, 'color: #F0F');
          return false;
        }
      }
      if (!Transaction.isValid(tx)) {
        console.warn(`%cBlock: Cannot verify signature: ${tx.fromAddress}`, 'color: #F0F');
        // signature check failed
        return false;
      }
      if (!balances.get(tx.fromAddress)) {
        balances.set(tx.fromAddress, blockchain.getBalanceOfAddress(tx.fromAddress, self.length - 2));
      }
      if (balances.get(tx.fromAddress) - tx.amount < 0.0) {
        console.warn(`%cBlock: Overspend from address: ${tx.fromAddress}`, 'color: #F0F');
        return false;
      }
    }
    if (!hasRewardTransaction) {
      console.warn('%cBlock: No reward transaction found', 'color: #F0F');
      return false;
    }
    return true;
  }
}
