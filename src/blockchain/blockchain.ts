import SmlCommon from '@/common';
import { SHA256 } from 'crypto-js';
import { Block } from './block';
import { Transaction } from './transaction';
/**
 * Instance class for a blockchain
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 */
export class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;

  constructor() {
    this.chain = [this.createGenesisBlock()];
    // assume a value for difficulty
    this.difficulty = 4;
    // Place to store transactions in between block creation
    this.pendingTransactions = [];
    // How many coins a miner will get as a reward for his/her efforts
    this.miningReward = 10.0;
  }
  /**
   * Creates the genesis block
   */
  createGenesisBlock() {
    return new Block(
      SmlCommon.generateTimestamp(),
      [],
      SHA256(Math.random().toString()).toString()
    );
  }

  /**
   * Create new block with all pending transactions and mine it
   */
  minePendingTransactions(miningRewardAddress: string) {
    let block = new Block(SmlCommon.generateTimestamp(), this.pendingTransactions);
    block.mineBlock(this.difficulty);

    // Add the newly mined block to the chain
    this.chain.push(block);

    // Reset the pending transactions and send the mining reward
    this.pendingTransactions = [
      new Transaction(null, miningRewardAddress, this.miningReward)
    ];
  }

  /**
   * Get the balance of an address
   */
  getBalanceOfAddress(address: string) {
    let balance = 0.0; // you start at zero!

    // Loop over each block and each transaction inside the block
    for (const block of this.chain) {
      for (const trans of block.transactions) {

        // If the given address is the sender -> reduce the balance
        if (trans.fromAddress === address) {
          balance -= trans.amount;
        }

        // If the given address is the receiver -> increase the balance
        if (trans.toAddress === address) {
          balance += trans.amount;
        }
      }
    }
    return balance;
  }

  /**
   * Get last added block
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Return the lenght of the chain
   */
  getBlockchainLength() {
    return this.chain.length;
  }

  /** 
   * Add new block to chain
   */
  addBlock(block: Block) {
    block.previousHash = this.getLatestBlock().hash;
    block.hash = block.generateHash();
    this.chain.push(block);
  }

  /**
   * Validate integrity of the blockchain
   */
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      // Recalculate the hash of the block and see if it matches up.    
      // This allows us to detect changes to a single block
      if (currentBlock.hash !== currentBlock.generateHash()) {
        return false;
      }

      // Check if this block actually points to the previous block (hash)
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      if (!currentBlock.hasValidTransactions()) {
        return false;
      }
    }
    // Check the genesis block
    if (this.chain[0] !== this.createGenesisBlock()) {
      return false;
    }
    // If we managed to get here, the chain is valid!
    return true;
  }

  /**
   * Add transaction to blockchain
   */
  addTransaction(transaction: Transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }

    this.pendingTransactions.push(transaction);
  }
}