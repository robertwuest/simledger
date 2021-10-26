import { BehaviorSubject, Subject } from 'rxjs';
import { Block } from '../blockchain/block';
import { System } from './system';
import { Tick } from './tick';
import { Transaction } from '../blockchain/transaction';
import { Blockchain } from '../blockchain/blockchain';
import SmlCommon from '../common';

export class SystemNode {
  public static InactiveThreshold = 20;
  public static get events() {
    return {
      BROADCAST_TX: 'system_node_broadcast_transaction',
      BROADCAST_BLOCK: 'system_node_broadcast_block',
      START_MINING: 'system_node_start_mining',
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
  }

  /**
   * Add a new node
   * @param node
   */
  connectToNode(node: SystemNode) {
    if (!this.connectedNodes.find(item => item.node === node)) {
      this.connectedNodes.push({
        node,
        inactiveCycles: 0,
        bkSub: node.broadcastBlock.subscribe(this.onNewBlock.bind(this)),
        txSub: node.broadcastTransaction.subscribe(this.onNewTransaction.bind(this)),
      });
      node.connectToNode(this);
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
   */
  orderTransaction(fromAddress: string, toAddress: string, amount: number, signingKey: any) {
    const tx = new Transaction(fromAddress, toAddress, amount);
    Transaction.signTransaction(tx, signingKey);
    this.blockchain.addTransaction(tx);
    this.pushToTickQueue(() => {
      this.broadcastTransaction.next({ tx, sender: this, referrer: this });
      this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_TX, referrer: this });
    });
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
      this.pushToTickQueue(() => {
        this.broadcastBlock.next({ block: newBlock, sender: this, rewardTx, referrer: this });
        this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_BLOCK, referrer: this });
        this.isMining = false;
        if (callback) {
          callback();
        }
      }, this.remainingMiningDelay);
    });
  }

  /**
   * Remove connected node due to inactivity
   * @param index
   */
  private forgetNode(index: number) {
    const { id } = this.connectedNodes[index].node;
    this.connectedNodes[index].bkSub.unsubscribe();
    this.connectedNodes[index].txSub.unsubscribe();
    this.connectedNodes.splice(index, 1);
    console.log(`Node removed due to inactivity: ${id}`);
  }

  /**
   * Event on incoming new block
   * @param bcBlock
   */
  private onNewBlock(bcBlock: any) {
    if (bcBlock) {
      console.log('New block');
      const { block, sender, rewardTx } = bcBlock;
      if (!this.blockchain.addBlock(block)) {
        console.log('Adding new block failed');
        // try to synchronize
        for (let i = this.blockchain.getBlockchainLength() + 1; i <= block.length; i++) {
          if (!this.blockchain.addBlock(sender.getBlock(i))) {
            console.log('Synchronization failed');
            break;
          }
        }
      } else {
        this.blockchain.addTransaction(rewardTx);
        this.pushToTickQueue(() => {
          this.broadcastBlock.next({ block, sender: this, rewardTx, referrer: sender });
          this.eventEmitter.next({ msg: SystemNode.events.BROADCAST_BLOCK, referrer: sender });
        });
      }
    }
  }

  /**
   * on incoming new transaction
   * @param bcTx
   */
  private onNewTransaction(bcTx: any) {
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
    this.connectedNodes.forEach((item, index) => {
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
