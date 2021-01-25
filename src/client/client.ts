import { Block } from "@/blockchain/block";
import { Blockchain } from "@/blockchain/blockchain";
import { BehaviorSubject } from "rxjs";

export class Client {
  blockchain: Blockchain;
  networkHandle: BehaviorSubject<Blockchain>;

  constructor(id: string, networkHandle: BehaviorSubject<Blockchain>) {
    // Create a new blockchain with a genesisblock to begin
    this.blockchain = new Blockchain();
    this.networkHandle = networkHandle;
    this.networkHandle.subscribe(this.onBroadcastedBlockchain.bind(this));
  }

  /**
   * Broadcast the blockchain to the network
   */
  public broadcastBlockchain() {
    this.networkHandle.next(this.blockchain);
  }

  /**
   * Handle a new incomming blockchain
   */
  onBroadcastedBlockchain(newBlockchain: Blockchain) {
    if (newBlockchain.getBlockchainLength() > this.blockchain.getBlockchainLength()
    && newBlockchain.isChainValid()) {
      this.blockchain = newBlockchain;
    }
  }
}