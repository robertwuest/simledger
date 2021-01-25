import { SHA256 } from "crypto-js";
import { Transaction } from "./transaction";
/**
 * Class representing a block within the blockchain
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 */
export class Block {
  previousHash: string;
  timestamp: string;
  transactions: Transaction[];
  hash: string;
  nonce: number;

  constructor(
    timestamp: string,
    transactions: Transaction[],
    previousHash = ""
  ) {
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.hash = this.generateHash();
    this.nonce = 0;
  }

  /**
   * Generate hash out of previous hash and timestamp
   */
  generateHash(length?: number) {
    let hash = SHA256(
      this.previousHash +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.nonce
    ).toString();
    return length && length < hash.length ? hash.substring(0, length) : hash;
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
  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }

    return true;
  }
}
