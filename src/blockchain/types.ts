/**
 * Type definitions for blockchain system
 */

export type LogLevel = 'log' | 'warn' | 'error';
export type LogCallback = (type: LogLevel, message: string) => void;

export interface BlockchainConfig {
  difficulty?: number;
  miningReward?: number;
  genesisAddress?: string;
  genesisAmount?: number;
}

export interface MinedBlockData {
  nonce: number;
  hash: string;
  previousHash: string;
  length: number;
  timestamp: string;
  transactions: any[];
  rewardAddress: string;
  previousRewardAddress: string;
}

export interface SerializableTransaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  nonce: string;
  signature: string;
  timestamp?: number;
}
