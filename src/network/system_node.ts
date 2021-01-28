import {BehaviorSubject} from "rxjs";
import {Block} from "@/blockchain/block";
import {System} from "@/network/system";
import {Tick} from "@/network/tick";
import {Transaction} from "@/blockchain/transaction";
import {Blockchain} from "@/blockchain/blockchain";
import SmlCommon from "@/common";

export class SystemNode {
  public static InactiveThreshold = 100;

  public connectedNodes: {
    node: SystemNode,
    inactiveCycles: number,
    txSub: any,
    bkSub: any,
  }[];

  private _system: System;
  private _keyPair: any;
  private _keyPairBS58: any;
  public id: string;
  public address: string;
  public blockchain: Blockchain;
  public broadcastBlock: BehaviorSubject<{ block: Block, sender: SystemNode }>;
  public broadcastTransaction: BehaviorSubject<{ tx:Transaction, sender: SystemNode }>;

  constructor(id: string, genesisAddress: string, system: System) {
    this.blockchain = new Blockchain(genesisAddress);
    this.id  = id;
    this._keyPair = SmlCommon.generateKeyPair();
    this._keyPairBS58 = {
      pub: SmlCommon.HexToBase58(this._keyPair.getPublic(true,'hex')),
      pk: SmlCommon.HexToBase58(this._keyPair.getPrivate('hex')),
    };
    this.address = this._keyPairBS58.pub;
    this.connectedNodes = [];
    // @ts-ignore
    this.broadcastBlock = new BehaviorSubject<{ block: Block, sender: SystemNode }>(null);
    // @ts-ignore
    this.broadcastTransaction = new BehaviorSubject<{ tx:Transaction, sender: SystemNode }>(null);
    this._system = system;
    this._system.tick.subscribe(this.tick.bind(this));
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
        txSub: node.broadcastTransaction.subscribe(this.onNewTransaction.bind(this))
      });
      node.connectToNode(this);
    }
  }

  /**
   * Get a block within the chain
   * @param chainLength
   */
  getBlock(chainLength: number) {
    return this.blockchain.getBlock(chainLength);
  }

  /**
   * Remove connected node due to inactivity
   * @param index
   */
  private forgetNode(index: number) {
    const id = this.connectedNodes[index].node.id;
    this.connectedNodes[index].bkSub.unsubscribe();
    this.connectedNodes[index].txSub.unsubscribe();
    this.connectedNodes.splice(index, 1);
    console.log('Node removed due to inactivity: ' + id);
  }

  /**
   * Event on incoming new block
   * @param bcBlock
   */
  private onNewBlock(bcBlock: any) {
    if (bcBlock) {
      console.log('New block');
      const { block, sender } = bcBlock;
      if (!this.blockchain.addBlock(block)) {
        console.log('Adding new block failed');
        // try to synchronize
        for (let i = this.blockchain.getBlockchainLength() + 1; i <= block.length; i++) {
          if (!this.blockchain.addBlock(sender.getBlock(i))) {
            console.log('Synchronization failed');
            break;
          }
        }
      }
    }
  }

  /**
   * on incoming new transaction
   * @param bcTx
   */
  private onNewTransaction(bcTx: any) {
    if (bcTx) {
      console.log('New transaction');
      if (!this.blockchain.addTransaction(bcTx.tx)) {
        console.log('Adding new transaction failed');
      }
    }
  }

  /**
   * Lifecycle callback
   * @param cycleTick
   */
  private tick(cycleTick: Tick) {
    this.connectedNodes.forEach((item, index) => {
      if (item.inactiveCycles > SystemNode.InactiveThreshold) {
        this.forgetNode(index);
      } else {
        item.inactiveCycles++;
      }
    });
  }
}
