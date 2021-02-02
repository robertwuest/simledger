import SmlCommon from '../common';
import { Transaction } from './transaction';
import { Block } from './block'; // eslint-disable-line

/**
 * Instance class for a blockchain
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 */
export class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;
  genesisAddress: string;

  constructor() {
    // assume a value for difficulty
    this.difficulty = 5;
    // Place to store transactions in between block creation
    this.pendingTransactions = [];
    // How many coins a miner will get as a reward for his/her efforts
    this.miningReward = 10.0;
    // genesis address
    this.genesisAddress = 'eb2WnqvmsejmUgxs7EkcUGEAzbxrTjhmH3nTMUJuUA3g';
    // setup the chain with a genesis block
    this.chain = [this.createGenesisBlock()];
    // reward initial genesis account
    this.addTransaction(new Transaction('_', this.genesisAddress, this.miningReward));
  }

  /**
   * Creates the genesis block
   */
  createGenesisBlock() {
    return new Block(
      1,
      '0',
      [new Transaction('_', this.genesisAddress, 100.0)],
      this.genesisAddress,
      'genesisRewardAddress',
      'genesisHash',
    );
  }

  /**
   * Create new block with all pending transactions and mine it
   */
  minePendingTransactions(miningRewardAddress: string, callback?: (newBlock: any, rewardTx: any) => void) {
    const block = new Block(this.chain.length + 1, SmlCommon.generateTimestamp(), this.pendingTransactions, miningRewardAddress, this.getLatestBlock().rewardAddress, this.getLatestBlock().hash);
    const callB = (newBlock: any) => {
      // Add the newly mined block to the chain
      if (this.addBlock(newBlock)) {
        const rewardTx = new Transaction('_', miningRewardAddress, this.miningReward);
        // Reset the pending transactions and send the mining reward
        this.pendingTransactions = [
          rewardTx,
        ];
        if (callback) {
          callback(newBlock, rewardTx);
        }
      }
    };
    Block.mineBlock(block, this.difficulty, callB);
  }

  /**
   * Get the balance of an address
   * WARNING! The bigger the chain becomes this function gets more expensive since we are using an account based ledger.
   * Bitcoin for example uses a transaction based ledger where the balance of an account is represented as a transaction
   */
  getBalanceOfAddress(address: string, blockIndex: number = this.chain.length - 1) {
    let balance = 0.0; // you start at zero!
    // Loop over each block and each transaction inside the block
    for (let i = blockIndex; i >= 0; i--) {
      const block = this.chain[i];
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
      console.log('%cBC: Block already known', 'color: #0FF');
      return false;
    }
    if (block.length !== this.getBlockchainLength() + 1) {
      console.warn('%cBC: Block denotes invalid chain length', 'color: #0FF');
      return false;
    }
    if (block.hash !== Block.generateHash(block)) {
      console.warn('%cBC: Block hash invalid');
      return false;
    }
    if (block.previousHash !== this.getLatestBlock().hash) {
      console.warn('%cBC: Block has invalid previous hash', 'color: #0FF');
      return false;
    }
    if (!Block.hasValidTransactions(block, this)) {
      console.warn('%cBC: Block has invalid transactions', 'color: #0FF');
      return false;
    }
    if (!block.hash.substring(0, this.difficulty).split('').every(val => val === '0')) {
      console.warn('%cBC: Block hash doesnt meet difficulty', 'color: #0FF');
      return false;
    }
    // add valid block to chain
    this.chain.push(block);
    // removed processed transactions
    for (let i = this.pendingTransactions.length - 1; i >= 0; i--) {
      if (block.transactions.find((tx) => Transaction.generateHash(tx) === Transaction.generateHash(this.pendingTransactions[i]))) {
        this.pendingTransactions.splice(i, 1);
      }
    }
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
      if (currentBlock.hash !== Block.generateHash(currentBlock)) {
        console.warn(`%c Chain invalid: Invalid hash at block length: ${currentBlock.length}`, 'background: #44FF44; color: #000');
        return false;
      }

      // Check if this block actually points to the previous block (hash)
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.warn(`%c Chain invalid: Invalid previous hash at block length: ${currentBlock.length}`, 'background: #44FF44; color: #000');
        return false;
      }

      if (!Block.hasValidTransactions(currentBlock, this)) {
        console.warn(`%c Chain invalid: Invalid transactions at block length: ${currentBlock.length}`, 'background: #44FF44; color: #000');
        return false;
      }
    }
    // Check the genesis block
    if (this.chain[0].hash !== Block.generateHash(this.createGenesisBlock())) {
      console.warn('%c Chain invalid: Genesis block invalid', 'background: #44FF44; color: #000');
      return false;
    }
    // If we managed to get here, the chain is valid!
    console.log('%c Chain is valid!', 'background: #00EE00; color: #000');
    return true;
  }

  /**
   * Add transaction to blockchain
   */
  addTransaction(transaction: Transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      console.log(transaction);
      console.warn('%cTX: Transaction must include from and to address', 'color: #FF0');
      return false;
    }

    if (!Transaction.isValid(transaction)) {
      console.log(transaction);
      console.warn('%cTX: Cannot add invalid transaction to chain', 'color: #FF0');
      return false;
    }

    if (transaction.fromAddress !== '_' && this.getBalanceOfAddress(transaction.fromAddress) - transaction.amount < 0.0) {
      console.log(transaction);
      console.warn('%cTX: Transaction overspend from sender', 'color: #FF0');
      return false;
    }

    if (transaction.fromAddress === '_') {
      if (transaction.amount !== this.miningReward) {
        console.log(transaction);
        console.warn('%cTX: Invalid reward', 'color: #FF0');
        return false;
      }
      if (this.pendingTransactions.find(tx => tx.fromAddress)) {
        console.log(transaction);
        console.warn('%cTX: Duplicated reward transaction', 'color: #FF0');
        return false;
      }
    }

    if (this.pendingTransactions.find(tx => Transaction.generateHash(transaction) === Transaction.generateHash(tx))) {
      console.log('%cTX: Transaction already known, do nothing', 'color: #FF0');
      return false;
    }

    this.pendingTransactions.push(transaction);
    return true;
  }
}
