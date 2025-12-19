# SimLedger API Reference

Complete API documentation for SimLedger blockchain simulation library.

## Table of Contents

1. [Blockchain Module](#blockchain-module)
2. [Network Module](#network-module)
3. [Utilities Module](#utilities-module)
4. [Graph/Visualization Module](#graphvisualization-module)

---

## Blockchain Module

Core blockchain implementation with proof-of-work consensus.

### Blockchain Class

Main container for the blockchain with proof-of-work consensus mechanism.

```typescript
export class Blockchain {
  chain: Block[];
  difficulty: number;
  pendingTransactions: Transaction[];
  miningReward: number;
  genesisAddress: string;
  logSubscribers: Function[];
}
```

#### Constructor

```typescript
constructor()
```

Creates a new blockchain instance with:
- Genesis block as the first block
- Difficulty set to 1
- Mining reward set to 10.0 coins
- Initial mining reward transaction

#### Methods

##### createGenesisBlock()

```typescript
createGenesisBlock(): Block
```

Creates the genesis block (first block in blockchain).

**Returns:**
- `Block` - Genesis block with predefined values

##### minePendingTransactions()

```typescript
minePendingTransactions(
  miningRewardAddress: string,
  callback?: (newBlock: Block, rewardTx: Transaction) => void
): void
```

Mines a new block containing all pending transactions.

**Parameters:**
- `miningRewardAddress` (string) - Address to receive mining reward
- `callback` (Function, optional) - Called with (newBlock, rewardTx) when mining completes

**Process:**
1. Creates a new block with pending transactions
2. Validates all transactions in the block
3. Initiates mining in a Web Worker
4. Invokes callback with mined block and reward transaction

**Example:**
```typescript
blockchain.minePendingTransactions('QmDkAddress', (newBlock, rewardTx) => {
  console.log('Block mined:', newBlock.hash);
});
```

##### getBalanceOfAddress()

```typescript
getBalanceOfAddress(
  address: string,
  blockIndex?: number
): number
```

Calculates the balance for an address by summing all transactions up to a block index.

**Parameters:**
- `address` (string) - Address to calculate balance for
- `blockIndex` (number, optional, default: chain.length-1) - Block index to calculate up to

**Returns:**
- `number` - Balance in coins

**Performance:** O(n) where n = total transactions in chain

**Warning:** Performance degrades with larger blockchains. Consider optimization for production.

**Example:**
```typescript
const balance = blockchain.getBalanceOfAddress('QmDkAddress');
console.log('Balance:', balance); // 100.5
```

##### getBlock()

```typescript
getBlock(chainLength: number): Block | null
```

Retrieves a specific block by index.

**Parameters:**
- `chainLength` (number) - Index of block to retrieve

**Returns:**
- `Block` - The block at the index
- `null` - If index is out of bounds

##### getLatestBlock()

```typescript
getLatestBlock(): Block
```

Gets the most recently added block.

**Returns:**
- `Block` - The last block in the chain

##### getBlockchainLength()

```typescript
getBlockchainLength(): number
```

Gets the total number of blocks in the chain.

**Returns:**
- `number` - Length of blockchain

##### addBlock()

```typescript
addBlock(block: Block): boolean
```

Adds a new block to the chain with comprehensive validation.

**Validation Checks:**
1. Block is not a duplicate
2. Block index is sequential (length = lastBlock.length + 1)
3. Block hash is correctly computed
4. Previous hash matches last block's hash
5. All transactions are valid
6. Proof-of-work difficulty is satisfied (leading zeros in hash)

**Parameters:**
- `block` (Block) - Block to add

**Returns:**
- `boolean` - True if block added successfully, false if validation failed

**Side Effects:**
- Removes processed transactions from pending queue on success
- Logs validation errors via registered subscribers

##### truncateChain()

```typescript
truncateChain(index: number): void
```

Removes all blocks from specified index onwards.

**Parameters:**
- `index` (number) - Index to truncate from

**Use Cases:**
- Handling chain forks
- Reverting to previous state

##### isChainValid()

```typescript
isChainValid(): boolean
```

Validates the integrity of the entire blockchain.

**Checks:**
1. Each block's hash is correctly computed
2. Each block's previousHash matches preceding block
3. All transactions in each block are valid
4. Genesis block is unchanged

**Returns:**
- `boolean` - True if valid, false if any block fails validation

**Performance:** O(n) where n = number of blocks

##### addTransaction()

```typescript
addTransaction(transaction: Transaction): boolean
```

Adds a transaction to the pending transactions queue.

**Validation Checks:**
1. From and to addresses are present
2. Transaction is not a duplicate
3. Transaction signature is valid
4. Sender has sufficient balance (including pending transactions)
5. Mining reward transactions are valid

**Parameters:**
- `transaction` (Transaction) - Transaction to add

**Returns:**
- `boolean` - True if added, false if validation failed

**Side Effects:**
- Logs validation errors via registered subscribers

##### registerLogSubscriber()

```typescript
registerLogSubscriber(callback: Function): void
```

Registers a callback to receive blockchain log events.

**Callback Signature:**
```typescript
(type: 'log' | 'warn' | 'error', message: string) => void
```

**Parameters:**
- `callback` (Function) - Function to call on log events

**Example:**
```typescript
blockchain.registerLogSubscriber((type, message) => {
  console.log(`[${type}] ${message}`);
});
```

##### log()

```typescript
log(type: string, message: string, params?: any): void
```

Internal method to log messages to console and subscribers.

**Parameters:**
- `type` (string) - Log type: 'log', 'warn', or 'error'
- `message` (string) - Message to log
- `params` (any, optional) - Parameters for console formatting

---

### Block Class

Immutable record of transactions with proof-of-work mining.

```typescript
export class Block {
  previousHash: string;
  timestamp: string;
  length: number;
  transactions: Transaction[];
  previousRewardAddress: string;
  rewardAddress: string;
  hash: string;
  nonce: number;
}
```

#### Constructor

```typescript
constructor(
  length: number,
  timestamp: string,
  transactions: Transaction[],
  rewardAddress: string,
  previousRewardAddress: string,
  previousHash?: string
)
```

Creates a new Block instance.

**Parameters:**
- `length` (number) - Block index in the chain
- `timestamp` (string) - Creation timestamp
- `transactions` (Transaction[]) - Transactions to include
- `rewardAddress` (string) - Address receiving mining reward
- `previousRewardAddress` (string) - Address that mined previous block
- `previousHash` (string, optional) - Hash of previous block

**Side Effects:**
- Automatically computes the block's hash upon creation

#### Static Methods

##### generateHash()

```typescript
static generateHash(block: Block): string
```

Computes the SHA256 hash of a block.

**Hash Input:**
```
previousHash + length + timestamp + transactions + rewardAddress + nonce
```

**Parameters:**
- `block` (Block) - Block to hash

**Returns:**
- `string` - SHA256 hash as hex string

**Note:** Hash changes if nonce changes, enabling proof-of-work mining.

##### mineBlock()

```typescript
static mineBlock(
  block: Block,
  difficulty: number,
  callback: (minedBlock: Block) => void
): void
```

Mines the block by finding a valid proof-of-work nonce in a Web Worker.

**Process:**
1. Sends block data to Web Worker
2. Worker increments nonce until hash has required leading zeros
3. Returns mined block to callback

**Parameters:**
- `block` (Block) - Block to mine
- `difficulty` (number) - Number of leading zeros required (e.g., 1 = "0...", 2 = "00...")
- `callback` (Function) - Called with mined block data

**Example:**
```typescript
Block.mineBlock(block, 1, (minedBlock) => {
  console.log('Block mined:', minedBlock.hash);
});
```

##### hasValidTransactions()

```typescript
static hasValidTransactions(
  block: Block,
  blockchain: Blockchain
): boolean
```

Validates all transactions in a block.

**Validation Checks:**
1. Exactly one reward transaction (fromAddress = '_')
2. Reward goes to previous miner (previousRewardAddress)
3. Reward amount matches blockchain's miningReward
4. All regular transactions have valid signatures
5. No double-spending (balances tracked across block)
6. At least one regular transaction exists

**Parameters:**
- `block` (Block) - Block to validate
- `blockchain` (Blockchain) - Blockchain context

**Returns:**
- `boolean` - True if all transactions valid, false otherwise

---

### Transaction Class

Cryptographically signed value transfer.

```typescript
export class Transaction {
  fromAddress: string;
  toAddress: string;
  amount: number;
  signature: any;
}
```

#### Constructor

```typescript
constructor(
  fromAddress: string,
  toAddress: string,
  amount: number,
  nonce?: string
)
```

Creates a new Transaction instance.

**Parameters:**
- `fromAddress` (string) - Sender's address (Base58 or '_' for mining rewards)
- `toAddress` (string) - Recipient's address (Base58)
- `amount` (number) - Amount to transfer
- `nonce` (string, optional) - Transaction nonce (auto-generated if not provided)

**Example:**
```typescript
const tx = new Transaction('QmFromAddr', 'QmToAddr', 50.0);
```

#### Static Methods

##### generateHash()

```typescript
static generateHash(transaction: Transaction): string
```

Generates a unique hash for the transaction.

**Hash Input:**
```
SHA256(fromAddress + toAddress + amount + nonce)
```

**Result:** Base58 encoded hash

**Parameters:**
- `transaction` (Transaction) - Transaction to hash

**Returns:**
- `string` - Base58 encoded transaction hash

##### signTransaction()

```typescript
static signTransaction(
  transaction: Transaction,
  signingKey: any
): void
```

Signs the transaction with the sender's private key.

**Process:**
1. Verifies signingKey's public key matches transaction.fromAddress
2. Computes transaction hash
3. Signs with ECDSA secp256k1
4. Stores signature in transaction.signature

**Parameters:**
- `transaction` (Transaction) - Transaction to sign
- `signingKey` (any) - Private key object from elliptic library

**Throws:**
- `Error` - If signing key's public key doesn't match fromAddress

**Example:**
```typescript
const keyPair = SmlCommon.generateKeyPair();
Transaction.signTransaction(tx, keyPair);
```

##### isValid()

```typescript
static isValid(
  transaction: Transaction,
  blockchain: Blockchain
): boolean
```

Validates the transaction.

**Validation Checks:**
1. Mining rewards (fromAddress = '_') skip signature validation
2. Sender and recipient addresses are different
3. Transaction has a signature
4. Signature is mathematically valid (verified with public key)

**Parameters:**
- `transaction` (Transaction) - Transaction to validate
- `blockchain` (Blockchain) - Blockchain context (for logging)

**Returns:**
- `boolean` - True if valid, false otherwise

**Note:** Balance validation is done at blockchain level, not here.

---

## Network Module

Multi-node blockchain network simulation.

### System Class

Main simulation engine driving all node updates via tick events.

```typescript
export class System {
  static CycleTime: number;
  tick: BehaviorSubject<Tick>;
  stopFlag: boolean;
}
```

#### Static Properties

##### CycleTime

```typescript
static CycleTime = 2000;  // milliseconds
```

Default cycle time in milliseconds. Determines tick interval.

#### Properties

##### tick

```typescript
tick: BehaviorSubject<Tick>
```

Observable tick events. Subscribe to receive cycle updates.

```typescript
system.tick.subscribe((tick: Tick) => {
  console.log(`Cycle ${tick.increment} at ${tick.elapsedTime}ms`);
});
```

#### Methods

##### start()

```typescript
start(): void
```

Starts the simulation loop, beginning tick emissions at regular intervals.

##### stop()

```typescript
stop(): void
```

Stops the simulation loop, preventing further tick emissions.

##### run()

```typescript
run(deltaTime: number): void
```

Internal method called recursively to drive simulation.

---

### SystemNode Class

Individual blockchain participant in the network.

```typescript
export class SystemNode {
  static InactiveThreshold: number;
  
  id: string;
  address: string;
  blockchain: Blockchain;
  keyPair: any;
  isMining: boolean;
  miningDelay: number;
  connectedNodes: Connection[];
  broadcastBlock: BehaviorSubject<BlockBroadcast>;
  broadcastTransaction: BehaviorSubject<TransactionBroadcast>;
  eventEmitter: Subject<NodeEvent>;
}
```

#### Constructor

```typescript
constructor(id: string, system: System)
```

Creates a new network node.

**Parameters:**
- `id` (string) - Unique node identifier
- `system` (System) - Reference to simulation system

**Side Effects:**
- Generates ECDSA secp256k1 key pair
- Creates blockchain instance
- Subscribes to system tick events

#### Properties

##### blockchain

```typescript
blockchain: Blockchain
```

This node's own blockchain instance with independent state.

##### address

```typescript
address: string
```

The node's public address (Base58 encoded public key). Used as transaction sender/recipient.

##### keyPair

```typescript
keyPair: KeyPair
```

ECDSA secp256k1 key pair for signing transactions.

##### broadcastBlock

```typescript
broadcastBlock: BehaviorSubject<BlockBroadcast>
```

Observable emitted when node mines a new block.

**Emission Value:**
```typescript
{
  block: Block;
  sender: SystemNode;
  rewardTx: Transaction;
  referrer: SystemNode;
}
```

##### broadcastTransaction

```typescript
broadcastTransaction: BehaviorSubject<TransactionBroadcast>
```

Observable emitted when node receives a new transaction.

**Emission Value:**
```typescript
{
  tx: Transaction;
  sender: SystemNode;
  referrer: SystemNode;
}
```

##### eventEmitter

```typescript
eventEmitter: Subject<NodeEvent>
```

Emits internal node events (mining, errors, blockchain logs).

#### Methods

##### connectToNode()

```typescript
connectToNode(node: SystemNode): boolean
```

Connects this node to another node (peer).

**Process:**
1. Subscribes to peer's block and transaction broadcasts
2. Reciprocal: also connects the peer to this node
3. Tracks peer as active connection

**Parameters:**
- `node` (SystemNode) - Peer to connect to

**Returns:**
- `boolean` - True if connection created, false if already connected

**Example:**
```typescript
node1.connectToNode(node2);  // node1 ↔ node2 connected bidirectionally
```

##### getBalance()

```typescript
getBalance(): number
```

Gets the node's current balance.

**Returns:**
- `number` - Balance of this node's address in coins

##### getBlock()

```typescript
getBlock(chainLength: number): Block | null
```

Gets a block from this node's blockchain.

**Parameters:**
- `chainLength` (number) - Block index

**Returns:**
- `Block` - The block at the index
- `null` - If index out of bounds

##### orderTransaction()

```typescript
orderTransaction(
  fromAddress: string,
  toAddress: string,
  amount: number,
  signingKey: any
): void
```

Orders a new transaction to be broadcast to the network.

**Parameters:**
- `fromAddress` (string) - Sender's address
- `toAddress` (string) - Recipient's address
- `amount` (number) - Amount to transfer
- `signingKey` (any) - Signing key for transaction (must match fromAddress)

**Process:**
1. Creates transaction
2. Signs with provided key
3. Broadcasts to all connected peers

##### getAddress()

```typescript
getAddress(): string
```

Gets this node's address (public key).

**Returns:**
- `string` - Base58 encoded address

---

### Tick Interface

Event emitted by System on each simulation cycle.

```typescript
export interface Tick {
  increment: number;     // Cycle counter (1, 2, 3, ...)
  elapsedTime: number;   // Cumulative time in milliseconds
}
```

**Properties:**
- `increment` - Sequential cycle number
- `elapsedTime` - Total elapsed time since system.start()

---

## Utilities Module

### SmlCommon Class

Cryptographic and utility functions.

```typescript
export default class SmlCommon {
  static curve: EC;  // secp256k1 elliptic curve
}
```

#### Static Methods

##### generateKeyPair()

```typescript
static generateKeyPair(privateKey?: string): KeyPair
```

Generates or imports an ECDSA secp256k1 key pair.

**Parameters:**
- `privateKey` (string, optional) - Base58 encoded private key to import

**Returns:**
- `KeyPair` - Elliptic library key pair object

**Example:**
```typescript
// Generate new key pair
const keyPair1 = SmlCommon.generateKeyPair();

// Import from private key
const keyPair2 = SmlCommon.generateKeyPair('QmPrivateKeyBase58');
```

##### HexToBase58()

```typescript
static HexToBase58(hexString: string): string
```

Converts a hex string to Base58 encoding.

**Parameters:**
- `hexString` (string) - Hex encoded string

**Returns:**
- `string` - Base58 encoded result

**Example:**
```typescript
const base58 = SmlCommon.HexToBase58('48656c6c6f');  // "9Ajdvzr"
```

##### Base58ToHex()

```typescript
static Base58ToHex(base58String: string): string
```

Converts a Base58 string to hex encoding.

**Parameters:**
- `base58String` (string) - Base58 encoded string

**Returns:**
- `string` - Hex encoded result

##### Uint8ArrayToHex()

```typescript
static Uint8ArrayToHex(bytes: Uint8Array): string
```

Converts a Uint8Array to hex string.

**Parameters:**
- `bytes` (Uint8Array) - Byte array

**Returns:**
- `string` - Hex encoded string

##### generateTimestamp()

```typescript
static generateTimestamp(): string
```

Gets the current timestamp.

**Returns:**
- `string` - Current timestamp in milliseconds

##### generateNonce()

```typescript
static generateNonce(): string
```

Generates a unique nonce for transactions.

**Returns:**
- `string` - Unique nonce value

##### RandomSeed()

```typescript
static RandomSeed(
  min: number,
  max: number,
  seed: number
): number
```

Generates a seeded random number.

**Parameters:**
- `min` (number) - Minimum value (inclusive)
- `max` (number) - Maximum value (inclusive)
- `seed` (number) - Seed for reproducibility

**Returns:**
- `number` - Random integer between min and max

**Example:**
```typescript
const r1 = SmlCommon.RandomSeed(1, 100, 12345);  // Deterministic
const r2 = SmlCommon.RandomSeed(1, 100, 12345);  // Same as r1
```

---

## Graph/Visualization Module

### Dracula Class

Main graph data structure.

```typescript
export default class Dracula {
  nodes: { [key: string]: DraculaNode };
  edges: DraculaEdge[];
  layoutMinX: number;
  layoutMinY: number;
  layoutMaxX: number;
  layoutMaxY: number;
}
```

#### Methods

##### addNode()

```typescript
addNode(id: string | number | object, nodeData?: object): DraculaNode
```

Adds a node to the graph (or gets existing node).

**Parameters:**
- `id` - Node identifier
- `nodeData` - Optional node data/properties

**Returns:**
- `DraculaNode` - The added or existing node

##### addEdge()

```typescript
addEdge(
  sourceNode: string | number | object,
  targetNode: string | number | object,
  opts?: object
): DraculaEdge
```

Adds a directed edge between two nodes.

**Parameters:**
- `sourceNode` - Source node or ID
- `targetNode` - Target node or ID
- `opts` - Optional edge properties (style, etc.)

**Returns:**
- `DraculaEdge` - The created edge

---

### Layout Classes

#### Spring Layout

Force-directed layout algorithm.

```typescript
export default class Spring extends Layout
```

Nodes repel each other while edges attract, settling into a natural equilibrium.

#### OrderedTree Layout

Binary tree layout algorithm.

```typescript
export default class OrderedTree extends Layout
```

Positions nodes at fixed Y coordinates based on tree depth.

#### TournamentTree Layout

Tournament bracket layout.

```typescript
export default class TournamentTree extends Layout
```

---

### Renderer Classes

#### Raphael Renderer

SVG rendering using Raphael library.

```typescript
export default class Raphael extends Renderer
```

Features:
- Draggable nodes
- Bezier curve edges
- Arrow heads for directed edges
- Node styling

#### SnapSVG Renderer

SVG rendering using SnapSVG library.

```typescript
export default class SnapSVG extends Renderer
```

Alternative renderer with similar capabilities.

---

## Type Definitions

### DraculaNode

```typescript
interface DraculaNode {
  id: string;
  data?: any;
  edges: DraculaEdge[];
  layoutPosX?: number;
  layoutPosY?: number;
}
```

### DraculaEdge

```typescript
interface DraculaEdge {
  source: DraculaNode;
  target: DraculaNode;
  style?: any;
}
```

### BlockBroadcast

```typescript
interface BlockBroadcast {
  block: Block;
  sender: SystemNode;
  rewardTx: Transaction;
  referrer: SystemNode;
}
```

### TransactionBroadcast

```typescript
interface TransactionBroadcast {
  tx: Transaction;
  sender: SystemNode;
  referrer: SystemNode;
}
```

---

## Usage Examples

### Creating a Blockchain and Mining

```typescript
import { Blockchain } from '~/src/blockchain/blockchain';
import { Transaction } from '~/src/blockchain/transaction';
import SmlCommon from '~/src/common';

// Create blockchain
const blockchain = new Blockchain();

// Create and sign transaction
const keyPair = SmlCommon.generateKeyPair();
const fromAddress = SmlCommon.HexToBase58(keyPair.getPublic(true, 'hex'));
const tx = new Transaction(fromAddress, 'QmRecipientAddress', 50.0);
Transaction.signTransaction(tx, keyPair);

// Add to blockchain
blockchain.addTransaction(tx);

// Mine a block
blockchain.minePendingTransactions(fromAddress, (newBlock, rewardTx) => {
  console.log('Block mined:', newBlock.hash);
  console.log('Balance:', blockchain.getBalanceOfAddress(fromAddress));
});
```

### Creating a Multi-Node Network

```typescript
import { System } from '~/src/network/system';
import { SystemNode } from '~/src/network/system_node';

// Create system
const system = new System();
system.start();

// Create nodes
const alice = new SystemNode('Alice', system);
const bob = new SystemNode('Bob', system);

// Connect nodes
alice.connectToNode(bob);

// Alice sends transaction
alice.orderTransaction(
  alice.address,
  bob.address,
  50.0,
  alice.keyPair
);

// Stop simulation
setTimeout(() => system.stop(), 10000);
```

### Visualizing a Graph

```typescript
import { Graph, Layout, Renderer } from '~/src/dracula';

// Create graph
const graph = Graph.create();

// Add nodes and edges
const node1 = graph.addNode('node1', { label: 'Alice' });
const node2 = graph.addNode('node2', { label: 'Bob' });
graph.addEdge(node1, node2, { directed: true });

// Layout
const layout = new Layout.Spring(graph);

// Render
const renderer = new Renderer.Raphael('canvas-id', graph);
renderer.draw();
```

---

## Error Handling

Common error scenarios:

1. **Invalid Transaction Signature**
   - Check that transaction is signed with correct private key
   - Ensure fromAddress matches signing key's public key

2. **Insufficient Balance**
   - Verify sender has enough coins for transaction amount
   - Account for pending transactions that reduce available balance

3. **Chain Validation Failure**
   - Block hash doesn't match computed hash
   - Previous hash doesn't link to last block
   - Transaction signatures are invalid

4. **Mining Timeout**
   - Increase difficulty gradually for testing
   - Higher difficulty = longer mining time

---

## Performance Tips

1. **Batch Transactions** - Add multiple transactions before mining
2. **Cache Balances** - Store frequently queried balances
3. **Use Indexed Lookup** - For large block lists
4. **Optimize Mining** - Adjust difficulty based on target block time
5. **Lazy Load** - Load transaction details on demand

---

## Related Documentation

- [README.md](README.md) - Project overview
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design
