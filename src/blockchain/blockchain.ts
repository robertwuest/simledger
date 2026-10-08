import SmlCommon from '../common';
import { Transaction } from './transaction';
import { Block } from './block';
import { AccountStateManager } from './account-state';

/**
 * Instance class for a blockchain with efficient state management
 *
 * Represents a complete blockchain with proof-of-work consensus. Manages the chain of blocks,
 * pending transactions, mining operations, and chain validation.
 *
 * Performance aspects with AccountStateManager:
 * - Balance lookups: O(1)
 * - Block validation: O(m)
 * - Chain validation: O(n×m)
 *
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 *
 * @class Blockchain
 * @property {Block[]} chain - Array of blocks in the blockchain
 * @property {number} difficulty - Number of leading zeros required in block hash (proof-of-work)
 * @property {Transaction[]} pendingTransactions - Transactions waiting to be included in next block
 * @property {number} miningReward - Reward in coins given to miner for successfully mining a block
 * @property {string} genesisAddress - Address of the genesis block recipient
 * @property {Function[]} logSubscribers - Callbacks for logging blockchain events
 * @property {AccountStateManager} stateManager - Efficient account state tracking
 */
export class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;
  genesisAddress: string;
  logSubscribers: Array<(type: string, message: string) => void> = [];
  private stateManager: AccountStateManager;

  /**
   * Creates a new Blockchain instance with a genesis block
   * Initializes with difficulty = 1, mining reward = 10.0, and empty pending transactions
   */
  constructor() {
    // assume a value for difficulty - when using simulated delay it should be set 1
    this.difficulty = 1;
    // Place to store transactions in between block creation
    this.pendingTransactions = [];
    // How many coins a miner will get as a reward for his/her efforts
    this.miningReward = 10.0;
    // genesis address
    this.genesisAddress = 'eb2WnqvmsejmUgxs7EkcUGEAzbxrTjhmH3nTMUJuUA3g';

    // Initialize state manager
    this.stateManager = new AccountStateManager();

    // setup the chain with a genesis block
    const genesisBlock = this.createGenesisBlock();
    this.chain = [genesisBlock];
    this.pendingTransactions = [new Transaction('_', this.genesisAddress, this.miningReward)];

    // Apply genesis block to state
    this.stateManager.applyBlock(genesisBlock);
  }

  /**
   * Creates the genesis block - the first block in the blockchain
   *
   * @returns {Block} The genesis block with predefined values
   */
  createGenesisBlock() {
    return new Block(
      1,
      '0',
      [new Transaction('_', this.genesisAddress, 100.0, 'GENESIS', 0)],
      this.genesisAddress,
      'genesisRewardAddress',
      'genesisHash',
    );
  }

  /**
   * Creates a new block with all pending transactions and initiates mining
   *
   * The mining process runs in a Web Worker to prevent blocking the UI.
   * Once mined, the callback is invoked with the new block and reward transaction.
   *
   * @param {string} miningRewardAddress - Address to receive the mining reward
   * @param {Function} [callback] - Callback function invoked with (newBlock, rewardTx) when mining completes
   */
  minePendingTransactions(miningRewardAddress: string, callback?: (newBlock: Block | null, rewardTx: Transaction | null) => void) {
    const block = new Block(
      this.chain.length + 1,
      SmlCommon.generateTimestamp(),
      this.pendingTransactions,
      miningRewardAddress,
      this.getLatestBlock().rewardAddress,
      this.getLatestBlock().hash
    );

    if (block.hasValidTransactions(this)) {
      const callB = (minedBlockData: { nonce: number; hash: string } | null) => {
        if (minedBlockData) {
          block.nonce = minedBlockData.nonce;
          block.hash = minedBlockData.hash;
          const rewardTx = new Transaction('_', miningRewardAddress, this.miningReward);
          if (callback) {
            callback(block, rewardTx);
          }
        } else {
          if (callback) {
            callback(null, null);
          }
        }
      };
      block.mineBlock(this.difficulty, callB);
    } else {
      if (callback) {
        callback(null, null);
      }
    }
  }

  /**
   * Gets the balance of an address - now O(1) with state manager!
   *
   * @param {string} address - The address to calculate balance for
   * @param {number} [blockIndex] - Optional block index to calculate balance up to
   * @returns {number} The balance in coins for the given address
   */
  getBalanceOfAddress(address: string, blockIndex?: number): number {
    if (blockIndex !== undefined && blockIndex < this.chain.length) {
      const block = this.chain[blockIndex]!;
      return this.stateManager.getBalanceAtBlock(address, block.hash);
    }
    return this.stateManager.getBalance(address);
  }

  /**
   * Truncates the blockchain at the specified index with state rollback
   *
   * Removes all blocks from the chain starting at the given index.
   * Useful for handling chain forks or resetting to a previous state.
   *
   * @param {number} index - The block index to truncate from
   */
  truncateChain(index: number) {
    if (index < this.getBlockchainLength() && index > 0) {
      this.chain.splice(index);
      const lastBlock = this.getLatestBlock();
      this.stateManager.revertToBlock(lastBlock.hash);
    }
  }

  /**
   * Retrieves a specific block from the chain by index
   *
   * @param {number} chainLength - The index of the block to retrieve
   * @returns {Block|null} The block at the given index, or null if out of bounds
   */
  getBlock(chainLength: number) {
    if (chainLength < this.getBlockchainLength()) {
      return this.chain[chainLength];
    }
    return null;
  }

  /**
   * Gets the most recently added block in the chain
   *
   * @returns {Block} The last block in the chain
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1]!;
  }

  /**
   * Gets the total length of the blockchain (number of blocks)
   *
   * @returns {number} The length of the blockchain
   */
  getBlockchainLength() {
    return this.chain.length;
  }

  /**
   * Adds a new block to the blockchain with comprehensive validation
   *
   * Validates:
   * - Block is not a duplicate
   * - Chain length is sequential
   * - Block hash is correctly computed
   * - Previous hash matches last block's hash
   * - All transactions in block are valid
   * - Proof-of-work difficulty is satisfied
   *
   * On successful addition, processed transactions are removed from pending queue
   * and state is updated via AccountStateManager.
   *
   * @param {Block} block - The block to add to the chain
   * @returns {boolean} True if block was added, false if validation failed
   */
  addBlock(block: Block) {
    // Check for duplicate in entire chain
    if (this.chain.some(b => b.hash === block.hash)) {
      this.log('log', '%c🔗: Block already known', 'color: #0FF');
      return false;
    }
    if (block.length !== this.getBlockchainLength() + 1) {
      this.log('warn', '%c🔗: Block denotes invalid chain length', 'color: #0FF');
      return false;
    }
    if (block.hash !== block.generateHash()) {
      this.log('warn', '%c🔗: Block hash invalid');
      return false;
    }
    if (block.previousHash !== this.getLatestBlock().hash) {
      this.log('warn', '%c🔗: Block has invalid previous hash', 'color: #0FF');
      return false;
    }
    if (!block.hasValidTransactions(this)) {
      this.log('warn', '%c🔗: Block has invalid transactions', 'color: #0FF');
      return false;
    }
    if (!block.hash.substring(0, this.difficulty).split('').every(val => val === '0')) {
      this.log('warn', '%c🔗: Block hash doesn\'t meet difficulty', 'color: #0FF');
      return false;
    }

    // add valid block to chain
    this.chain.push(block);

    // Apply state changes - O(m) where m = transactions
    const stateRoot = this.stateManager.applyBlock(block);

    // removed processed transactions - O(n) instead of O(n²)
    const blockTxHashes = new Set(
      block.transactions.map(tx => tx.generateHash())
    );
    this.pendingTransactions = this.pendingTransactions.filter(
      tx => !blockTxHashes.has(tx.generateHash())
    );

    this.log('log', `%c🔗: Block added. State root: ${stateRoot.substring(0, 8)}...`, 'color: #0FF');
    return true;
  }

  /**
   * Validates the integrity of the entire blockchain
   *
   * Checks each block's:
   * - Hash is correctly computed
   * - Previous hash reference matches preceding block
   * - All transactions are valid
   *
   * Also validates the genesis block is unchanged.
   *
   * WARNING: Performance degrades with blockchain size. Use sparingly on large chains.
   *
   * @returns {boolean} True if blockchain is valid, false if any block fails validation
   */
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i]!;
      const previousBlock = this.chain[i - 1]!;
      // Recalculate the hash of the block and see if it matches up.
      // This allows us to detect changes to a single block
      if (currentBlock.hash !== currentBlock.generateHash()) {
        this.log('warn', `%c✗ Chain invalid: Invalid hash at block length: ${currentBlock.length}`, 'background: #44FF44; color: #000');
        return false;
      }

      // Check if this block actually points to the previous block (hash)
      if (currentBlock.previousHash !== previousBlock.hash) {
        this.log('warn', `%c✗ Chain invalid: Invalid previous hash at block length: ${currentBlock.length}`, 'background: #44FF44; color: #000');
        return false;
      }

      if (!currentBlock.hasValidTransactions(this)) {
        this.log('warn', `%c✗ Chain invalid: Invalid transactions at block length: ${currentBlock.length}`, 'background: #44FF44; color: #000');
        return false;
      }
    }
    // Check the genesis block
    if (this.chain[0]!.hash !== this.createGenesisBlock().hash) {
      this.log('warn', '%c✗ Chain invalid: Genesis block invalid', 'background: #44FF44; color: #000');
      return false;
    }
    // If we managed to get here, the chain is valid!
    this.log('log', '%c✓ Chain is valid!', 'background: #00EE00; color: #000');
    return true;
  }

  /**
   * Adds a transaction to the pending transactions queue with efficient validation
   *
   * Validates:
   * - From and to addresses are present
   * - Transaction is not a duplicate
   * - Transaction signature is valid
   * - Sender has sufficient balance (using O(1) state manager lookup)
   * - Mining reward transactions are handled correctly
   *
   * Valid transactions are added to the pending queue waiting for mining.
   *
   * @param {Transaction} transaction - The transaction to add
   * @returns {boolean} True if transaction was added, false if validation failed
   */
  addTransaction(transaction: Transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      console.log(transaction);
      this.log('warn', '%c⇄: Transaction must include from and to address', 'color: #FF0');
      return false;
    }

    if (this.pendingTransactions.find(tx => tx.generateHash() === transaction.generateHash())) {
      this.log('log', '%c⇄: Transaction already known, do nothing', 'color: #FF0');
      return false;
    }

    if (!transaction.isValid(this)) {
      console.log(transaction);
      this.log('warn', '%c⇄: Cannot add invalid transaction to chain', 'color: #FF0');
      return false;
    }

    // Use state manager for O(1) balance check
    if (transaction.fromAddress !== '_') {
      if (!this.stateManager.canSpend(
        transaction.fromAddress,
        transaction.amount,
        this.pendingTransactions
      )) {
        const balance = this.stateManager.getBalance(transaction.fromAddress);
        console.log(transaction);
        this.log('warn', `%c⇄: Insufficient balance. Has: ${balance}, Needs: ${transaction.amount}`, 'color: #FF0');
        return false;
      }
    }

    if (transaction.fromAddress === '_') {
      if (transaction.amount !== this.miningReward) {
        console.log(transaction);
        this.log('warn', '%c⇄: Invalid reward', 'color: #FF0');
        return false;
      }
      // FIX: Correctly check for duplicate reward transactions
      if (this.pendingTransactions.find(tx => tx.fromAddress === '_')) {
        console.log(transaction);
        this.log('warn', '%c⇄: Duplicated reward transaction', 'color: #FF0');
        return false;
      }
    }

    this.pendingTransactions.push(transaction);
    return true;
  }

  /**
   * Registers a callback function to receive blockchain log events
   *
   * Useful for monitoring blockchain activity, errors, and warnings in the UI.
   * Callback receives: (type: 'log' | 'warn' | 'error', message: string)
   *
   * @param {Function} callback - Function to call when logging occurs
   */
  registerLogSubscriber(callback: (type: string, message: string) => void) {
    this.logSubscribers.push(callback);
  }

  /**
   * Logs a message to the console and notifies all registered log subscribers
   *
   * @param {string} type - Log type: 'log', 'warn', or 'error'
   * @param {string} message - The message to log
   * @param {any} [params] - Optional parameters for console formatting
   */
  log(type: string, message: string, params?: any) {
    switch (type) {
      case 'warn':
        console.warn(message, params);
        this.notifyLogSubscribers('warn', message);
        break;
      case 'error':
        console.error(message, params);
        this.notifyLogSubscribers('error', message);
        break;
      default:
        console.log(message, params);
        this.notifyLogSubscribers('log', message);
        break;
    }
  }

  /**
   * Internal method to notify all registered log subscribers of a logging event
   *
   * @private
   * @param {string} type - Log type: 'log', 'warn', or 'error'
   * @param {string} message - The message to broadcast
   */
  notifyLogSubscribers(type: string, message: string) {
    this.logSubscribers.forEach((subscriber) => {
      subscriber(type, message);
    });
  }

  /**
   * Check if a block is the genesis block
   *
   * @param {Block} block - The block to check
   * @returns {boolean} True if genesis block
   */
  isGenesisBlock(block: Block): boolean {
    return block.length === 1 || block.previousHash === 'genesisHash';
  }

  /**
   * Get the current state root hash
   *
   * @returns {string|undefined} The state root hash
   */
  getCurrentStateRoot(): string | undefined {
    return this.stateManager.getStateRoot(this.getLatestBlock().hash);
  }

  /**
   * Prune old state snapshots (for memory management)
   *
   * @param {number} keepLastN - Number of recent states to keep (default: 100)
   */
  pruneOldStates(keepLastN: number = 100): void {
    this.stateManager.pruneOldStates(keepLastN);
  }

  /**
   * Get all accounts with balances
   *
   * @returns {Map<string, number>} Map of all accounts and their balances
   */
  getAllAccounts(): Map<string, number> {
    return this.stateManager.getAllAccounts();
  }

  /**
   * Get state manager statistics
   *
   * @returns {object} Statistics about the state manager
   */
  getStateStats(): {
    accountCount: number;
    blockStateCount: number;
    totalBalance: number;
  } {
    return this.stateManager.getStats();
  }
}
