import { SHA256 } from "crypto-js";
import { Transaction } from "./transaction";
import {Blockchain} from "@/blockchain/blockchain";
import SmlCommon from "@/common";
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
    previousHash = "",
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
   * Generate hash out of previous hash and timestamp
   */
  generateHash() {
    let hash = SHA256(
      this.previousHash +
        this.length +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.rewardAddress +
        this.nonce
    ).toString();
    return hash;
  }

  /**
   * Keep changing the nonce until the hash of our block starts with enough zero's.
   */
  mineBlock(difficulty: number) {
    while (
      this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
    ) {
      this.nonce++;
      this.hash = this.generateHash();
    }
    console.log("BLOCK MINED: " + this.hash);
  }

  /**
   * Block has valid transactions
   */
  hasValidTransactions(blockchain: Blockchain) {
    const balances = new Map();
    let hasRewardTransaction = false;
    for (const tx of this.transactions) {
      if (tx.fromAddress === '_') {
        if (hasRewardTransaction) {
          // reject another reward transaction
          console.warn('BK: More than one reward transaction found');
          return false;
        }
        hasRewardTransaction = true;
        if(tx.toAddress === this.previousRewardAddress &&
        tx.amount === blockchain.miningReward) {
          // reward transaction valid
          continue;
        } else {
          // fraudulent reward address or invalid mining reward
          console.warn('BK: Fraudulent reward address or invalid mining reward to recipient: ' + tx.toAddress);
          return false;
        }
      }
      if (!tx.isValid()) {
        // signature check failed
        return false;
      }
      if (!balances.get(tx.fromAddress)) {
        balances.set(tx.fromAddress, blockchain.getBalanceOfAddress(tx.fromAddress));
      }
      if (balances.get(tx.fromAddress) - tx.amount < 0.0) {
        console.warn('BK: Overspend from address: ' + tx.fromAddress);
        return false;
      }
    }
    if (!hasRewardTransaction) {
      console.warn('BK: No reward transaction found');
      return false;
    }
    return true;
  }
}
