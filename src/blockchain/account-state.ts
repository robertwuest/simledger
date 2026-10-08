import SHA256 from 'crypto-js/sha256';
import type { Transaction } from './transaction';
import type { Block } from './block';

/**
 * Account state manager with O(1) balance lookups
 *
 * Maintains state snapshots at each block for historical queries
 * and provides efficient balance tracking through incremental updates.
 *
 * @class AccountStateManager
 */
export class AccountStateManager {
  // Current state: address → balance
  private currentState: Map<string, number>;

  // Historical states: blockHash → (address → balance)
  private blockStates: Map<string, Map<string, number>>;

  // State root hashes: blockHash → stateRootHash
  private stateRoots: Map<string, string>;

  constructor() {
    this.currentState = new Map();
    this.blockStates = new Map();
    this.stateRoots = new Map();
  }

  /**
   * Get current balance - O(1)
   * @param address - The address to query
   * @returns The current balance
   */
  getBalance(address: string): number {
    return this.currentState.get(address) ?? 0;
  }

  /**
   * Get historical balance at specific block - O(1)
   * @param address - The address to query
   * @param blockHash - The block hash to query at
   * @returns The balance at that block
   */
  getBalanceAtBlock(address: string, blockHash: string): number {
    const state = this.blockStates.get(blockHash);
    return state?.get(address) ?? 0;
  }

  /**
   * Apply a transaction to current state - O(1)
   * @param tx - The transaction to apply
   */
  applyTransaction(tx: Transaction): void {
    // Deduct from sender (unless it's a reward transaction)
    if (tx.fromAddress !== '_') {
      const fromBalance = this.currentState.get(tx.fromAddress) ?? 0;
      this.currentState.set(tx.fromAddress, fromBalance - tx.amount);
    }

    // Add to recipient
    const toBalance = this.currentState.get(tx.toAddress) ?? 0;
    this.currentState.set(tx.toAddress, toBalance + tx.amount);
  }

  /**
   * Apply a block and create state snapshot - O(m) where m=transactions in block
   * @param block - The block to apply
   * @returns The state root hash
   */
  applyBlock(block: Block): string {
    // Apply all transactions
    for (const tx of block.transactions) {
      this.applyTransaction(tx);
    }

    // Create snapshot of current state
    const stateSnapshot = new Map(this.currentState);
    this.blockStates.set(block.hash, stateSnapshot);

    // Calculate and store state root hash
    const stateRoot = this.calculateStateRoot();
    this.stateRoots.set(block.hash, stateRoot);

    return stateRoot;
  }

  /**
   * Revert to a previous block state - O(1)
   * @param blockHash - The block hash to revert to
   * @returns True if revert was successful
   */
  revertToBlock(blockHash: string): boolean {
    const state = this.blockStates.get(blockHash);
    if (!state) return false;

    this.currentState = new Map(state);
    return true;
  }

  /**
   * Calculate Merkle root of current state - O(n log n) where n=accounts
   *
   * Creates a Merkle tree of all account balances for cryptographic verification.
   * The root hash can be included in blocks for light client verification.
   *
   * @returns The Merkle root hash
   */
  private calculateStateRoot(): string {
    // Sort accounts for deterministic ordering
    const accounts = Array.from(this.currentState.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (accounts.length === 0) return '0';

    // Build Merkle tree bottom-up
    let level = accounts.map(([address, balance]) =>
      SHA256(address + ':' + balance).toString()
    );

    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          // Hash pairs together
          nextLevel.push(SHA256(level[i]! + level[i + 1]!).toString());
        } else {
          // Odd node gets promoted to next level
          nextLevel.push(level[i]!);
        }
      }
      level = nextLevel;
    }

    return level[0]!;
  }

  /**
   * Validate balance for transaction - O(1)
   *
   * Checks if an address has sufficient balance to spend,
   * accounting for pending transactions.
   *
   * @param address - The address to check
   * @param amount - The amount to spend
   * @param pendingTxs - Pending transactions to account for
   * @returns True if the address can spend this amount
   */
  canSpend(address: string, amount: number, pendingTxs: Transaction[] = []): boolean {
    const currentBalance = this.getBalance(address);

    // Calculate pending spend
    const pendingSpend = pendingTxs
      .filter(tx => tx.fromAddress === address)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return currentBalance - pendingSpend >= amount;
  }

  /**
   * Get all accounts with balances
   * @returns Map of all accounts and their balances
   */
  getAllAccounts(): Map<string, number> {
    return new Map(this.currentState);
  }

  /**
   * Get state root hash for a block
   * @param blockHash - The block hash
   * @returns The state root hash
   */
  getStateRoot(blockHash: string): string | undefined {
    return this.stateRoots.get(blockHash);
  }

  /**
   * Prune old state snapshots (for memory management)
   *
   * Removes old state snapshots to prevent unbounded memory growth.
   * Keeps the most recent N blocks for historical queries.
   *
   * @param keepLastN - Number of recent states to keep
   */
  pruneOldStates(keepLastN: number): void {
    const hashes = Array.from(this.blockStates.keys());
    if (hashes.length <= keepLastN) return;

    const toPrune = hashes.slice(0, hashes.length - keepLastN);
    for (const hash of toPrune) {
      this.blockStates.delete(hash);
      this.stateRoots.delete(hash);
    }
  }

  /**
   * Get statistics about the state manager
   * @returns Statistics object
   */
  getStats(): {
    accountCount: number;
    blockStateCount: number;
    totalBalance: number;
  } {
    const totalBalance = Array.from(this.currentState.values())
      .reduce((sum, balance) => sum + balance, 0);

    return {
      accountCount: this.currentState.size,
      blockStateCount: this.blockStates.size,
      totalBalance,
    };
  }
}
