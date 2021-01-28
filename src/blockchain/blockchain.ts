import SmlCommon from '@/common';
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
  initialAddress: string;

  constructor(initialAddress: string) {
    // assume a value for difficulty
    this.difficulty = 4;
    // Place to store transactions in between block creation
    this.pendingTransactions = [];
    // How many coins a miner will get as a reward for his/her efforts
    this.miningReward = 10.0;
    // genesis address
    this.initialAddress = initialAddress;
    // setup the chain with a genesis block
    this.chain = [this.createGenesisBlock()];
    // reward initial genesis account
    this.addTransaction(new Transaction("_", initialAddress, this.miningReward));
  }
  /**
   * Creates the genesis block
   */
  createGenesisBlock() {
    return new Block(
      0,
      SmlCommon.generateTimestamp(),
      [],
      this.initialAddress,
      "genesisRewardAddress",
      "genesisHash"
    );
  }

  /**
   * Create new block with all pending transactions and mine it
   */
  minePendingTransactions(miningRewardAddress: string) {
    let block = new Block(this.chain.length, SmlCommon.generateTimestamp(), this.pendingTransactions, miningRewardAddress, this.getLatestBlock().rewardAddress, this.getLatestBlock().hash);
    block.mineBlock(this.difficulty);

    // Add the newly mined block to the chain
    this.chain.push(block);

    const rewardTx = new Transaction('_', miningRewardAddress, this.miningReward);

    // Reset the pending transactions and send the mining reward
    this.pendingTransactions = [
      rewardTx
    ];
  }

  /**
   * Get the balance of an address
   * WARNING! The bigger the chain becomes this function gets more expensive since we are using an account based ledger.
   * Bitcoin for example uses a transaction based ledger where the balance of an account is represented as a transaction
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
   * Get block in chain
   * @param chainLength
   */
  getBlock(chainLength: number) {
    if (chainLength < this.getBlockchainLength()) {
      return this.chain[chainLength];
    }
    return null;
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
    if (block.hash === this.getLatestBlock().hash) {
      console.log('BC: Block already known');
      return false;
    }
    if (block.length !== this.getBlockchainLength() + 1) {
      console.log('BC: Block denotes invalid chain length');
      return false;
    }
    if (block.hash !== block.generateHash()) {
      console.log('BC: Block hash invalid');
      return false;
    }
    if (block.previousHash !== this.getLatestBlock().hash) {
      console.log('BC: Block has invalid previous hash');
      return false;
    }
    if (block.hasValidTransactions(this)) {
      console.log('BC: Block has invalid transactions');
      return false;
    }
    if (block.hash.substring(0, this.difficulty).split('').every(val => val === '0')) {
      console.log('BC: Block hash doesnt meet difficulty');
      return false;
    }
    this.chain.push(block);
    return true;
  }

  /**
   * Validate integrity of the blockchain
   * WARNING! The bigger the chain becomes this function gets more expensive
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

      if (!currentBlock.hasValidTransactions(this)) {
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
      console.warn('TX: Transaction must include from and to address');
      return false;
    }

    if (!transaction.isValid()) {
      console.warn('TX: Cannot add invalid transaction to chain');
      return false;
    }

    if (transaction.fromAddress !== '_' && this.getBalanceOfAddress(transaction.fromAddress) - transaction.amount < 0.0) {
      console.warn('TX: Transaction overspend from sender');
      return false;
    }

    if (transaction.fromAddress === '_') {
      if (transaction.amount !== this.miningReward) {
        console.warn('TX: Invalid reward');
        return false;
      }
      if (this.pendingTransactions.find(tx => tx.fromAddress)) {
        console.log(transaction);
        console.warn('TX: Duplicated reward transaction');
        return false;
      }
    }

    this.pendingTransactions.push(transaction);
    return true;
  }
}
