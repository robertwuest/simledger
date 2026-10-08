import { BehaviorSubject, Subject } from 'rxjs';
import { Block } from '../blockchain/block';
import { System } from './system';
import type { Tick } from './tick';
import { Transaction } from '../blockchain/transaction';
import { Blockchain } from '../blockchain/blockchain';
import SmlCommon from '../common';

/**
 * Two connected nodes whose blockchains diverge (fork)
 */
export interface ChainConflict {
  /** Id of the connected peer */
  peerId: string;
  /** Index of the first block that differs; all blocks before are shared */
  forkIndex: number;
  /** Number of blocks in this node's chain */
  ownLength: number;
  /** Number of blocks in the peer's chain */
  peerLength: number;
  /** True if this node decided to keep its chain for the current state of both chains */
  retained: boolean;
}

/** How a node came to switch to another chain */
type ChainSwitchReason = 'longest-chain' | 'manual';

export class SystemNode {
  public static InactiveThreshold = 20;
  public static get events() {
    return {
      BROADCAST_TX: 'system_node_broadcast_transaction',
      BROADCAST_BLOCK: 'system_node_broadcast_block',
      START_MINING: 'system_node_start_mining',
      MESSAGE: 'system_node_message',
      CHAIN_CONFLICT: 'system_node_chain_conflict',
      CHAIN_ADOPTED: 'system_node_chain_adopted',
      CHAIN_RETAINED: 'system_node_chain_retained',
    };
  }

  public connectedNodes: {
    node: SystemNode,
    inactiveCycles: number,
    txSub: any,
    bkSub: any,
  }[];
  private system: System;
  public keyPair: any;
  private keyPairBS58: any;
  private currentTick!: Tick;
  public remainingMiningDelay = 0;
  private readonly tickQueue: any[];
  private rollSeed = Math.floor(Math.random() * Math.floor(0xFFFF));
  private freezeTransactions = false;
  /** Set while connecting; the peer's replayed broadcasts must not report a conflict that resolves itself */
  private connecting = false;
  /** Conflicts the user resolved by keeping this node's chain: peer id → state of both chains */
  private readonly retainedConflicts = new Map<string, string>();
  /** Conflicts already reported in the log: peer id → state of both chains */
  private readonly reportedConflicts = new Map<string, string>();

  public id: string;
  public miningDelay = 0;
  public isMining = false;
  public address: string;
  public blockchain: Blockchain;
  public broadcastBlock: BehaviorSubject<{ block: Block, sender: SystemNode, rewardTx: Transaction, referrer: SystemNode }>;
  public broadcastTransaction: BehaviorSubject<{ tx: Transaction, sender: SystemNode, referrer: SystemNode }>;
  public eventEmitter = new Subject();

  constructor(id: string, system: System) {
    this.blockchain = new Blockchain();
    this.id = id;
    this.keyPair = SmlCommon.generateKeyPair();
    this.keyPairBS58 = {
      pub: SmlCommon.HexToBase58(this.keyPair.getPublic(true, 'hex')),
      pk: SmlCommon.HexToBase58(this.keyPair.getPrivate('hex')),
    };
    this.address = this.keyPairBS58.pub;
    this.connectedNodes = [];
    // @ts-ignore
    this.broadcastBlock = new BehaviorSubject<{ block: Block, sender: SystemNode, referrer: SystemNode }>(null);
    // @ts-ignore
    this.broadcastTransaction = new BehaviorSubject<{ tx: Transaction, sender: SystemNode, referrer: SystemNode }>(null);
    this.system = system;
    this.tickQueue = [];
    this.system.tick.subscribe(this.tick.bind(this));
    this.blockchain.registerLogSubscriber((type, message) => {
      this.eventEmitter.next({ msg: SystemNode.events.MESSAGE, referrer: this, payload: { type, message } });
    });
  }

  /**
   * Add a new node
   * @param node
   */
  connectToNode(node: SystemNode) {
    if (!this.connectedNodes.find(item => item.node === node)) {
      this.freezeTransactions = true;
      this.connecting = true;
      // Subscribing replays the peer's latest block, a longer chain is adopted right away
      this.connectedNodes.push({
        node,
        inactiveCycles: 0,
        bkSub: node.broadcastBlock.subscribe(this.onNewBlock.bind(this)),
        txSub: node.broadcastTransaction.subscribe(this.onNewTransaction.bind(this)),
      });

      node.connectToNode(this);
      this.connecting = false;
      // Both nodes applied the longest-chain rule, a remaining fork is a conflict
      this.reportConflict(node);
      return true;
    }
    return false;
  }

  /**
   * Get a block within the chain
   * @param chainLength
   */
  getBlock(chainLength: number) {
    return this.blockchain.getBlock(chainLength);
  }

  /**
   * Return balance of own address
   */
  getBalance() {
    return this.blockchain.getBalanceOfAddress(this.address);
  }

  /**
   * Sign and order a transaction
   * @param fromAddress
   * @param toAddress
   * @param amount
   * @param signingKey
   * @returns true if the transaction was accepted into the pending pool
   */
  orderTransaction(fromAddress: string, toAddress: string, amount: number, signingKey: any): boolean {
    const tx = new Transaction(fromAddress, toAddress, amount);
    tx.signTransaction(signingKey);
    if (this.blockchain.addTransaction(tx)) {
      this.pushToTickQueue(() => {
        this.broadcastTransaction.next({ tx, sender: this, referrer: this });
        this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_TX, referrer: this });
      });
      return true;
    }
    return false;
  }

  /**
   * Begin mining a new block and return the callback function when completed
   * This functions simulates the mining efforts with an artificial delay in addition to a given
   * difficulty. The calculatedMiningDelay can be set to be always 0 to deactivate this mechanic.
   * This is suitable in case you want to use an actual proof of work algorithm
   * @param callback
   */
  startMining(callback?: () => void) {
    this.miningDelay = SmlCommon.RandomSeed(0, 5, this.currentTick.increment + this.rollSeed);
    this.remainingMiningDelay = this.miningDelay;
    this.isMining = true;
    this.eventEmitter.next({ msg: SystemNode.events.START_MINING });
    this.blockchain.minePendingTransactions(this.keyPairBS58.pub, (newBlock, rewardTx) => {
      if (newBlock) {
        this.pushToTickQueue(() => {
          // Reset the pending transactions and send the mining reward
          // Add the newly mined block to the chain
          if (this.blockchain.addBlock(newBlock)) {
            // The pool now starts with the reward for this block; keep transfers that arrived while mining
            this.blockchain.restorePendingTransactions([rewardTx!, ...this.blockchain.pendingTransactions]);
            this.broadcastBlock.next({ block: newBlock, sender: this, rewardTx: rewardTx!, referrer: this });
            this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_BLOCK, referrer: this });
            this.isMining = false;
            if (callback) {
              callback();
            }
          } else {
            // The chain changed while mining (a peer's block arrived or the chain was switched)
            this.isMining = false;
            this.log('warn', `%c⛏: Mined block #${newBlock.length - 1} rejected, the chain changed while mining`);
          }
        }, this.remainingMiningDelay);
      } else {
        this.isMining = false;
      }
    });
  }

  /**
   * Remove connected node
   * @param id
   */
  public forgetNode(id: string) {
    const node = this.connectedNodes.find(nd => nd.node.id === id);
    const index = this.connectedNodes.findIndex(nd => nd.node.id === id);
    if (node) {
      node.bkSub.unsubscribe();
      node.txSub.unsubscribe();
      this.connectedNodes.splice(index, 1);
      this.retainedConflicts.delete(id);
      this.reportedConflicts.delete(id);
    }
  }

  /**
   * Connected peers whose blockchain diverges from this node's blockchain
   *
   * A peer that is only ahead or behind (one chain is a prefix of the other) is not in
   * conflict, the shorter chain simply catches up with the next block.
   */
  getChainConflicts(): ChainConflict[] {
    return this.connectedNodes
      .map(({ node }) => this.compareChain(node))
      .filter((conflict): conflict is ChainConflict => conflict !== null);
  }

  /**
   * Keep this node's chain in a conflict with a connected peer
   *
   * The decision holds until one of the two chains changes; the peer keeps its own chain.
   * @param peerId - Id of the connected peer
   * @returns true if there was a conflict to resolve
   */
  retainChain(peerId: string): boolean {
    const peer = this.getPeer(peerId);
    const conflict = peer && this.compareChain(peer);
    if (!peer || !conflict) {
      return false;
    }
    this.retainedConflicts.set(peerId, this.conflictKey(peer));
    this.log('log', `%c⛓: Retained own chain (${conflict.ownLength} blocks), ignoring ${peerId}'s conflicting chain (${conflict.peerLength} blocks, fork at block #${conflict.forkIndex})`);
    this.eventEmitter.next({ msg: SystemNode.events.CHAIN_RETAINED, referrer: peer });
    return true;
  }

  /**
   * Switch to the chain of a connected peer, regardless of its length
   *
   * The node validates the peer's chain, returns transactions of discarded blocks to its
   * pending pool and broadcasts the new latest block to its other peers.
   * @param peerId - Id of the connected peer
   * @returns true if the peer's chain was valid and adopted
   */
  adoptChain(peerId: string): boolean {
    const peer = this.getPeer(peerId);
    if (!peer || !this.compareChain(peer)) {
      return false;
    }
    if (!this.switchChain(peer, 'manual')) {
      return false;
    }
    const block = this.blockchain.getLatestBlock();
    const rewardTx = this.blockchain.pendingTransactions.find(tx => tx.fromAddress === '_')!;
    this.pushToTickQueue(() => {
      this.broadcastBlock.next({ block, sender: this, rewardTx, referrer: peer });
      this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_BLOCK, referrer: peer });
    });
    return true;
  }

  private getPeer(peerId: string): SystemNode | undefined {
    return this.connectedNodes.find(item => item.node.id === peerId)?.node;
  }

  /** State of both chains, a conflict decision is bound to it */
  private conflictKey(peer: SystemNode): string {
    return `${this.blockchain.getLatestBlock().hash}|${peer.blockchain.getLatestBlock().hash}`;
  }

  /**
   * Compare this node's chain with a peer's chain
   * @returns the conflict, or null if the chains do not diverge
   */
  private compareChain(peer: SystemNode): ChainConflict | null {
    const ownLength = this.blockchain.getBlockchainLength();
    const peerLength = peer.blockchain.getBlockchainLength();
    const forkIndex = this.blockchain.getForkIndex(peer.blockchain.chain);
    if (forkIndex >= Math.min(ownLength, peerLength)) {
      return null;
    }
    return {
      peerId: peer.id,
      forkIndex,
      ownLength,
      peerLength,
      retained: this.retainedConflicts.get(peer.id) === this.conflictKey(peer),
    };
  }

  /**
   * Log a conflict with a peer once per state of both chains
   */
  private reportConflict(peer: SystemNode) {
    const conflict = this.compareChain(peer);
    if (!conflict || conflict.retained) {
      return;
    }
    const key = this.conflictKey(peer);
    if (this.reportedConflicts.get(peer.id) === key) {
      return;
    }
    this.reportedConflicts.set(peer.id, key);
    const lengths = conflict.ownLength === conflict.peerLength
      ? `both ${conflict.ownLength} blocks`
      : `own ${conflict.ownLength} blocks, ${peer.id}'s ${conflict.peerLength} blocks`;
    this.log('warn', `%c⛓: Chain conflict with ${peer.id}: chains fork at block #${conflict.forkIndex} (${lengths}). Keeping own chain, retain it or adopt ${peer.id}'s chain in the explorer`);
    this.eventEmitter.next({ msg: SystemNode.events.CHAIN_CONFLICT, referrer: peer });
  }

  /**
   * Replace the own chain with a peer's chain and rebuild the pending pool
   * @param peer - Node whose chain is adopted
   * @param reason - Longest-chain rule or a user decision, used for the log message
   * @returns true if the peer's chain was valid and adopted
   */
  private switchChain(peer: SystemNode, reason: ChainSwitchReason): boolean {
    const oldLength = this.blockchain.getBlockchainLength();
    const forkIndex = this.blockchain.getForkIndex(peer.blockchain.chain);
    const ownPending = this.blockchain.pendingTransactions;
    const discarded = this.blockchain.replaceChain([...peer.blockchain.chain]);
    const rule = reason === 'longest-chain' ? 'longer ' : '';
    if (!discarded) {
      this.log('warn', `%c⛓: Rejected ${peer.id}'s ${rule}chain, it failed validation`);
      return false;
    }
    const returned = discarded.flatMap(block => block.transactions).filter(tx => tx.fromAddress !== '_');
    const { accepted } = this.blockchain.restorePendingTransactions([
      ...peer.blockchain.pendingTransactions,
      ...returned,
      ...ownPending,
    ]);
    const newLength = this.blockchain.getBlockchainLength();
    const requeued = returned.filter(tx => accepted.includes(tx)).length;
    const details = [`${oldLength} → ${newLength} blocks`];
    if (discarded.length) {
      details.push(`fork at block #${forkIndex}`, `${discarded.length} own ${discarded.length === 1 ? 'block' : 'blocks'} discarded`);
    }
    if (requeued) {
      details.push(`${requeued} ${requeued === 1 ? 'transaction' : 'transactions'} returned to the pending pool`);
    }
    const action = discarded.length
      ? `Adopted ${peer.id}'s ${rule}chain`
      : `Synchronized ${newLength - oldLength} missing ${newLength - oldLength === 1 ? 'block' : 'blocks'} from ${peer.id}`;
    const why = reason === 'longest-chain' && discarded.length ? ' (longest-chain rule)' : '';
    this.log('log', `%c⛓: ${action}${why}: ${details.join(', ')}`);
    this.reportedConflicts.delete(peer.id);
    this.retainedConflicts.delete(peer.id);
    this.eventEmitter.next({ msg: SystemNode.events.CHAIN_ADOPTED, referrer: peer });
    return true;
  }

  /**
   * Log a message of this node (shown in the console of the UI)
   */
  private log(type: 'log' | 'warn' | 'error', message: string) {
    this.blockchain.log(type, message);
  }

  /**
   * Event on incoming new block
   *
   * - The block extends the own chain: add it and relay it to the other peers
   * - The sender's chain is longer: switch to it (longest-chain rule) and relay the block
   * - The sender's chain diverges but is not longer: keep the own chain and report the conflict
   * @param bcBlock
   */
  private onNewBlock(bcBlock: any) {
    if (!bcBlock) {
      return;
    }
    const { block, sender, rewardTx } = bcBlock as { block: Block, sender: SystemNode, rewardTx: Transaction };
    const ownPending = this.blockchain.pendingTransactions;
    let accepted = this.blockchain.addBlock(block);
    if (accepted) {
      // Keep the sender's pool (incl. the reward for the new block's miner) and the own transfers
      this.blockchain.restorePendingTransactions([rewardTx, ...sender.blockchain.pendingTransactions, ...ownPending]);
    } else if (this.blockchain.getBlockchainLength() < sender.blockchain.getBlockchainLength()) {
      accepted = this.switchChain(sender, 'longest-chain');
    } else if (!this.connecting) {
      this.reportConflict(sender);
    }
    if (accepted && this.blockchain.isChainValid()) {
      this.pushToTickQueue(() => {
        this.broadcastBlock.next({ block, sender: this, rewardTx, referrer: sender });
        this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_BLOCK, referrer: sender });
      });
      // Relay the own transfers, the sender may not know them yet
      ownPending
        .filter(tx => tx.fromAddress !== '_' && this.blockchain.pendingTransactions.includes(tx))
        .forEach((tx) => {
          this.pushToTickQueue(() => {
            this.broadcastTransaction.next({ tx, sender: this, referrer: this });
            this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_TX, referrer: this });
          });
        });
    }
  }

  /**
   * on incoming new transaction
   * @param bcTx
   */
  private onNewTransaction(bcTx: any) {
    if (this.freezeTransactions) {
      this.freezeTransactions = false;
      return;
    }
    if (bcTx) {
      console.log(`New transaction from ${bcTx.sender.id}`);
      const { tx, sender } = bcTx;
      if (!this.blockchain.addTransaction(tx)) {
        console.log('Adding new transaction failed');
      } else {
        this.pushToTickQueue(() => {
          this.broadcastTransaction.next({ tx, sender: this, referrer: sender });
          this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_TX, referrer: sender });
        });
      }
    }
  }

  /**
   * Add a function to be executed on next tick of network system
   * @param func
   * @param delay simulate mining delay for playback. For real time application this is always 0
   */
  private pushToTickQueue(func: any, delay = 0) {
    this.tickQueue.push({ func, tick: this.currentTick, delay });
  }

  /**
   * Lifecycle callback
   * @param cycleTick
   */
  private tick(cycleTick: Tick) {
    this.currentTick = cycleTick;
    this.connectedNodes.forEach((item) => {
      if (item.inactiveCycles > SystemNode.InactiveThreshold) {
        // this.forgetNode(index);
      } else {
        item.inactiveCycles += 1;
      }
    });
    for (let i = this.tickQueue.length - 1; i >= 0; i--) {
      const item = this.tickQueue[i];
      if (item.tick.increment < (cycleTick.increment - item.delay)) {
        this.tickQueue.splice(i, 1);
        setTimeout(() => {
          item.func();
        }, 0);
      }
    }
    if (this.remainingMiningDelay > 0) {
      this.remainingMiningDelay -= 1;
    }
  }

  getRemainingMiningDelayPercentage() {
    return ((this.miningDelay - this.remainingMiningDelay) / this.miningDelay) * 100;
  }
}
