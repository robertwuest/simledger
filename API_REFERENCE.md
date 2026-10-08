# SimLedger API Reference

API documentation for SimLedger 0.1.1-alpha.1. The domain (`src/`) is framework-free TypeScript; the
application (`app/`) builds on Vue 3 / Nuxt 4. Imports use the Nuxt aliases `~~/` (project root) and `~/` (`app/`).

## Table of Contents

1. [Blockchain Module](#blockchain-module) – `Blockchain`, `Block`, `Transaction`, `AccountStateManager`
2. [Network Module](#network-module) – `System`, `SystemNode`, `ChainConflict`, `Tick`
3. [Utilities Module](#utilities-module) – `SmlCommon`
4. [Application Module](#application-module) – network store, animations, scenes, helpers
5. [Type Definitions](#type-definitions)
6. [Usage Examples](#usage-examples)
7. [Console Messages](#console-messages)
8. [Error Handling](#error-handling)

---

## Blockchain Module

### Blockchain Class

`src/blockchain/blockchain.ts` – one node's ledger: chain, pending pool, validation and chain replacement.

```typescript
export class Blockchain {
  chain: Block[];
  difficulty: number;                 // leading zeros required in a block hash (default 1)
  pendingTransactions: Transaction[];
  miningReward: number;               // default 10
  genesisAddress: string;             // wallet funded by the genesis block
  logSubscribers: Array<(type: string, message: string) => void>;
}
```

#### Constructor

```typescript
new Blockchain()
```

Creates the genesis block (100 coins to `genesisAddress`) and a pending pool containing the reward for the
genesis block's "miner" (`genesisAddress`).

#### Chain Access

| Method | Returns | Description |
| --- | --- | --- |
| `createGenesisBlock()` | `Block` | The deterministic genesis block |
| `getBlock(index)` | `Block \| null` | Block at an index (0 = genesis), `null` if out of range |
| `getLatestBlock()` | `Block` | Last block of the chain |
| `getBlockchainLength()` | `number` | Number of blocks |
| `isGenesisBlock(block)` | `boolean` | Whether the block is the genesis block |

#### minePendingTransactions()

```typescript
minePendingTransactions(
  miningRewardAddress: string,
  callback?: (newBlock: Block | null, rewardTx: Transaction | null) => void
): void
```

Creates a block from a copy of the pending pool and mines it in a Web Worker. The callback receives the mined
block and a new reward transaction for `miningRewardAddress` (to be included in the next block), or `null, null`
if the pending transactions are invalid, the worker fails or mining times out (5 minutes). The block is **not**
added to the chain; call `addBlock()`.

#### addBlock()

```typescript
addBlock(block: Block): boolean
```

Adds a block that extends the chain. Checks, in order: not already known, `length` is the next position,
hash matches the content, `previousHash` matches the latest block, transactions are valid
(`Block.hasValidTransactions`), proof of work. On success the block's transactions are removed from the pending
pool and the account state is updated. Every rejection is logged as a warning.

#### addTransaction()

```typescript
addTransaction(transaction: Transaction): boolean
```

Adds a transaction to the pending pool. Checks: both addresses present, not already pending, valid signature,
sender can cover it including its pending spends. Reward transactions (`fromAddress === '_'`) must pay exactly
`miningReward` and only one may be pending.

#### isChainValid()

```typescript
isChainValid(): boolean
```

Re-validates every block's hash, its link to the previous block and its transactions, and the genesis block.
Logs the result. O(n × m).

#### getBalanceOfAddress()

```typescript
getBalanceOfAddress(address: string, blockIndex?: number): number
```

Confirmed balance of an address – current, or after the block at `blockIndex`. O(1).

#### getForkIndex()

```typescript
getForkIndex(blocks: Block[]): number
```

Index of the first block whose hash differs from `blocks`. If one chain is a prefix of the other, the length of
the shorter chain is returned. Both chains share all blocks before the returned index.

```typescript
own.getForkIndex(peer.chain); // 1: both chains only share the genesis block
```

#### replaceChain()

```typescript
replaceChain(blocks: Block[]): Block[] | null
```

Replaces the chain with `blocks` (including the genesis block) if the whole chain is valid. The candidate is
replayed block by block on a fresh `Blockchain` with logging muted, so it passes the same checks as `addBlock()`.
On success the chain and account state are swapped and the discarded own blocks (after the fork index) are
returned; on failure `null` is returned and nothing changes. The pending pool is not touched.

#### restorePendingTransactions()

```typescript
restorePendingTransactions(candidates: Transaction[]): { accepted: Transaction[]; dropped: Transaction[] }
```

Rebuilds the pending pool after the chain changed. The pool starts with a reward for the latest block's miner
(taken from the candidates, or created), followed by the candidates that are not yet confirmed, not duplicated
and still valid. Rewards for other addresses are ignored, invalid candidates are returned in `dropped`.
Validation is not logged.

#### truncateChain()

```typescript
truncateChain(index: number): void
```

Removes all blocks from `index` on (the genesis block is kept) and reverts the account state.

#### State Helpers

| Method | Returns | Description |
| --- | --- | --- |
| `getAllAccounts()` | `Map<string, number>` | Current balances of all addresses |
| `getCurrentStateRoot()` | `string \| undefined` | Merkle root of the balances after the latest block |
| `getStateStats()` | `{ accountCount, blockStateCount, totalBalance }` | State manager statistics |
| `pruneOldStates(keepLastN = 100)` | `void` | Drop balance snapshots of older blocks |

#### Logging

```typescript
registerLogSubscriber(callback: (type: string, message: string) => void): void
log(type: 'log' | 'warn' | 'error', message: string, params?: any): void
```

`log()` writes to the browser console and notifies all subscribers. Messages may start with `%c` (console
styling), which the UI strips. `SystemNode` subscribes to its blockchain and re-emits the messages as `MESSAGE`
events.

---

### Block Class

`src/blockchain/block.ts`

```typescript
export class Block {
  previousHash: string;
  timestamp: string;              // ms since epoch, '0' for genesis
  length: number;                 // 1-based position in the chain
  transactions: Transaction[];
  previousRewardAddress: string;  // miner of the previous block
  rewardAddress: string;          // miner of this block
  hash: string;
  nonce: number;
}
```

#### Constructor

```typescript
new Block(length, timestamp, transactions, rewardAddress, previousRewardAddress, previousHash = '')
```

Computes the hash on creation.

#### Methods

| Method | Description |
| --- | --- |
| `generateHash(): string` | SHA256 (hex) of `previousHash + length + timestamp + transaction hashes + rewardAddress + nonce` |
| `mineBlock(difficulty, callback: (result: { nonce, hash } \| null) => void): void` | Proof of work in the `js/mining.js` Web Worker; `null` on error or after 5 minutes |
| `hasValidTransactions(blockchain): boolean` | Exactly one reward transaction, paying `miningReward` to `previousRewardAddress` (not required directly after genesis); valid signatures; no sender overspends relative to the parent block; at least one regular transfer |

---

### Transaction Class

`src/blockchain/transaction.ts`

```typescript
export class Transaction {
  fromAddress: string;   // Base58 public key, '_' for a mining reward
  toAddress: string;
  amount: number;
  nonce: string;
  timestamp: number;
  signature: string;     // DER hex, empty for rewards
}
```

#### Constructor

```typescript
new Transaction(fromAddress: string, toAddress: string, amount: number, nonce?: string, timestamp?: number)
```

Throws for a non-finite or negative amount. `nonce` and `timestamp` are generated when omitted (pass them for
deterministic transactions such as the genesis transaction).

#### Methods

| Method | Description |
| --- | --- |
| `generateHash(): string` | SHA256 (hex) of `fromAddress + toAddress + amount + nonce + timestamp` |
| `signTransaction(signingKey): void` | ECDSA secp256k1 signature; throws `Cannot sign transactions for other wallets` if the key does not match `fromAddress` |
| `isValid(blockchain): boolean` | Rewards are valid; otherwise sender ≠ recipient and the signature verifies. Balances are checked by `Blockchain` |
| `static generateNonce(): string` | Timestamp + random, base36 |

```typescript
const tx = new Transaction(fromAddress, toAddress, 25);
tx.signTransaction(keyPair);
blockchain.addTransaction(tx);
```

---

### AccountStateManager Class

`src/blockchain/account-state.ts` – used internally by `Blockchain`.

| Method | Description |
| --- | --- |
| `getBalance(address)` | Current balance, O(1) |
| `getBalanceAtBlock(address, blockHash)` | Balance after a block, O(1) |
| `applyTransaction(tx)` | Apply a transfer to the current balances |
| `applyBlock(block): string` | Apply all transactions, store a snapshot and return the state root |
| `revertToBlock(blockHash): boolean` | Restore the balances after a block |
| `canSpend(address, amount, pendingTxs = [])` | Balance minus pending spends covers `amount` |
| `getAllAccounts()`, `getStateRoot(blockHash)`, `pruneOldStates(keepLastN)`, `getStats()` | Inspection and memory management |

---

## Network Module

### System Class

`src/network/system.ts` – the simulation clock.

```typescript
export class System {
  static CycleTime: number;      // 2000 ms
  tick: BehaviorSubject<Tick>;
  stopFlag: boolean;
  start(): void;                 // emit a tick every CycleTime
  stop(): void;                  // stop after the current cycle
  run(deltaTime: number): void;  // internal cycle
}
```

```typescript
system.tick.subscribe(({ increment, elapsedTime }) => console.log(increment, elapsedTime));
```

### Tick Interface

```typescript
export interface Tick {
  increment: number;    // cycle counter
  elapsedTime: number;  // ms since start
}
```

---

### SystemNode Class

`src/network/system_node.ts` – a network participant with its own blockchain and wallet.

```typescript
export class SystemNode {
  static InactiveThreshold: number;
  static readonly events: {
    BROADCAST_TX: string;
    BROADCAST_BLOCK: string;
    START_MINING: string;
    MESSAGE: string;
    CHAIN_CONFLICT: string;
    CHAIN_ADOPTED: string;
    CHAIN_RETAINED: string;
  };

  id: string;
  address: string;                 // Base58 compressed public key
  keyPair: any;                    // elliptic key pair
  blockchain: Blockchain;
  connectedNodes: { node: SystemNode; inactiveCycles: number; txSub: any; bkSub: any }[];
  isMining: boolean;
  miningDelay: number;             // lottery roll 0–5 (extra ticks)
  remainingMiningDelay: number;
  broadcastBlock: BehaviorSubject<BlockBroadcast>;
  broadcastTransaction: BehaviorSubject<TransactionBroadcast>;
  eventEmitter: Subject<NodeEvent>;
}
```

#### Constructor

```typescript
new SystemNode(id: string, system: System)
```

Generates a key pair, creates a blockchain and subscribes to the system ticks.

#### Events

Published on `eventEmitter` as `{ msg, referrer?, payload? }`:

| `msg` | `referrer` | `payload` | Emitted when |
| --- | --- | --- | --- |
| `BROADCAST_TX` | node the transaction came from | – | The node sends or relays a transaction |
| `BROADCAST_BLOCK` | node the block came from | – | The node sends or relays a block |
| `START_MINING` | – | – | Mining started |
| `MESSAGE` | the node | `{ type: 'log' \| 'warn' \| 'error', message }` | A log message of the node or its blockchain |
| `CHAIN_CONFLICT` | peer | – | A chain conflict with the peer was detected and logged |
| `CHAIN_ADOPTED` | peer | – | The node switched to the peer's chain |
| `CHAIN_RETAINED` | peer | – | The node retained its chain in a conflict with the peer |

#### Peers

```typescript
connectToNode(node: SystemNode): boolean   // bidirectional; false if already connected
forgetNode(id: string): void               // unsubscribe from a peer (call on both sides)
```

Connecting replays the peers' latest broadcasts, so both nodes apply the longest-chain rule right away; a fork
remaining afterwards is reported as a conflict.

#### Transactions and Mining

```typescript
orderTransaction(fromAddress: string, toAddress: string, amount: number, signingKey: any): boolean
startMining(callback?: () => void): void
getBalance(): number
getBlock(index: number): Block | null
getRemainingMiningDelayPercentage(): number
```

- `orderTransaction` signs the transaction and adds it to the own pool; it is broadcast on the next tick. Returns
  `false` if the node rejects it.
- `startMining` rolls the lottery delay, mines the pending pool and, after the delay, adds the block, broadcasts
  it and calls `callback`. If the chain changed in the meantime, the block is rejected, mining stops and a
  warning is logged.

#### Chain Conflicts

```typescript
getChainConflicts(): ChainConflict[]
retainChain(peerId: string): boolean
adoptChain(peerId: string): boolean
```

- `getChainConflicts` lists connected peers whose chain diverges from the own chain (a fork). Peers that are only
  ahead or behind are not listed.
- `retainChain` keeps the own chain. The decision is bound to the latest blocks of both chains and ends when
  either changes. Logs and emits `CHAIN_RETAINED`; `false` if there is no conflict with the peer.
- `adoptChain` switches to the peer's chain regardless of its length: validates it, returns transfers of the
  discarded own blocks to the pending pool, logs, emits `CHAIN_ADOPTED` and broadcasts the new latest block on
  the next tick. `false` if there is no conflict or the peer's chain is invalid.

Incoming blocks follow the longest-chain rule automatically, see [ARCHITECTURE.md](ARCHITECTURE.md#fork-handling-and-chain-conflicts).

### ChainConflict Interface

```typescript
export interface ChainConflict {
  peerId: string;      // connected peer
  forkIndex: number;   // first differing block (0 = genesis)
  ownLength: number;   // blocks in the own chain
  peerLength: number;  // blocks in the peer's chain
  retained: boolean;   // the node decided to keep its chain for the current state of both chains
}
```

---

## Utilities Module

### SmlCommon Class

`src/common.ts` – static helpers.

| Member | Description |
| --- | --- |
| `curve` | secp256k1 `elliptic` curve |
| `generateKeyPair(privateKey?)` | New key pair, or imported from a Base58 private key |
| `HexToBase58(hex)` / `Base58ToHex(base58)` | Encoding conversion |
| `BufferFromHex(hex): Uint8Array` | Throws for non-strings and odd lengths |
| `Uint8ArrayToHex(bytes)` | Lowercase hex without prefix |
| `generateTimestamp(): string` | Current time in ms |
| `generateNonce(): string` | 4 random alphanumeric characters |
| `RandomSeed(min, max, seed)` | Deterministic integer in `[min, max]` for a numeric seed |

```typescript
const keyPair = SmlCommon.generateKeyPair();
const address = SmlCommon.HexToBase58(keyPair.getPublic(true, 'hex'));
```

---

## Application Module

### Network Store

`app/composables/useNetwork.ts` – single source of truth for the UI.

```typescript
const network = createNetworkStore(options?: {
  system?: System;                  // custom clock (tests)
  animations?: BroadcastAnimations; // custom animation store (tests)
  flashDuration?: number;           // warning flash, default 2000 ms
});
provideNetwork(network);            // in a parent component (app.vue)
const network = useNetwork();       // in descendants
```

**State**

| Member | Type | Description |
| --- | --- | --- |
| `system` | `System` | Simulation clock |
| `animations` | `BroadcastAnimations` | Packets on the edges |
| `nodes` / `nodeIds` | `ShallowRef<SystemNode[]>` / `ComputedRef<string[]>` | Nodes in creation order |
| `edges` | `ComputedRef<NetworkEdge[]>` | `{ id: 'A--B', source, target }`, derived from the peer connections |
| `conflictEdgeIds` | `ComputedRef<Set<string>>` | Edges whose nodes have diverging chains and at least one has not decided |
| `selectedNodeId` | `Ref<string \| null>` | Selection shared by graph, explorer and editor |
| `flashing` | `Ref<string[]>` | Nodes currently flashing a warning |
| `running` | `Ref<boolean>` | Whether the clock runs |
| `version` | `Ref<number>` | Bumped whenever domain state may have changed |

**Queries**

| Method | Returns |
| --- | --- |
| `getNode(id)` | `SystemNode \| undefined` |
| `getNodeView(id)` | `NodeView \| undefined` – `{ id, address, balance, isMining, miningDelay, connectedIds, chainLength, openConflicts }` |
| `getChainConflicts(id)` | `ChainConflict[]` (empty for unknown nodes) |
| `isConnected(a, b)` | `boolean` |
| `nextNodeName()` | Unused name for a new node |

**Actions**

| Method | Description |
| --- | --- |
| `addNode(id)` | Create a node (returns the existing one for a known id) |
| `connect(a, b)` / `disconnect(a, b)` / `toggleConnection(a, b)` | Peer connections |
| `select(id \| null)` | Select a node (unknown ids clear the selection) |
| `orderTransaction(issuerId, fromAddress, toAddress, amount, signingKey): boolean` | Low-level transaction |
| `sendTransaction(issuerId, fromId, toId, amount): boolean` | Transfer between two node wallets |
| `startMining(id)` | Mine the node's pending pool (no-op while mining) |
| `validateChain(id): boolean` | Validate the node's chain |
| `adoptChain(id, peerId): boolean` | Resolve a conflict by switching `id` to the peer's chain |
| `retainChain(id, peerId): boolean` | Resolve a conflict by keeping `id`'s chain |
| `start()` / `stop()` / `dispose()` / `touch()` | Clock, cleanup, manual refresh |

### Broadcast Animations

`app/composables/useBroadcastAnimations.ts`

```typescript
const animations = createBroadcastAnimations({ duration?: number, now?: () => number, reducedMotion?: () => boolean });
animations.launch('tx' | 'block', fromId, toId): Packet;
animations.packetsFor(edgeId): Packet[];
animations.purgeEdge(edgeId);
animations.clear();
prefersReducedMotion(): boolean;
```

`Packet`: `{ id, kind, edgeId, fromId, toId, startedAt, duration }`; packets expire after `duration`
(default `PACKET_DURATION`, 2000 ms).

### Scene Setup

`app/config/scenes.ts`, `app/composables/useSceneSetup.ts`

```typescript
interface SceneConfig {
  name: string;
  nodes: { id: string; role?: 'genesis' | 'validator' | 'user' }[];
  connections: { from: string; to: string }[];
  genesis?: { privateKey: string; recipient: string; amount: number };
}

const { initializeScene } = useSceneSetup();
const cancel = initializeScene(defaultScene, network); // genesis transaction after GENESIS_DELAY (1000 ms)
cancel();                                              // cancel a pending genesis transaction
```

Presets: `defaultScene`, `simpleScene`, `scenes`.

### Other Composables and Plugins

| API | Description |
| --- | --- |
| `useAssetUrl()(path)` | URL of a file in `public/` under the configured base URL |
| `useAppVersion()` / `$version` | App version from `package.json` (runtime config `public.appVersion`) |

### Helpers

`app/utils/`

```typescript
// address.ts
MINING_REWARD_ADDRESS                                  // '_'
describeAddress(address, nodes, genesisAddress?): { label, kind: 'reward' | 'genesis' | 'node' | 'external' }

// graph/broadcast.ts
edgeId(a, b): string                                   // 'A--B', order independent
resolveBroadcastTargets(senderId, referrerId, neighborIds): string[]

// graph/spring-layout.ts
computeSpringLayout(ids, edges, { iterations?, scale?, padding?, rng? }): Record<string, { x, y }>
seededRandom(seed): () => number

// graph/motion.ts
PACKET_DURATION, PACKET_FADE_START
easeInOutQuad(t), packetOpacity(t), progressAt(now, { startedAt, duration }), pointOnPath(path, t, reverse?)

// graph/floating-edge.ts
getFloatingEdgeParams(sourceRect, targetRect): { sx, sy, tx, ty, sourceSide, targetSide }
getRectIntersection(from, to), getSide(rect, point)

// graph/colors.ts
nodeColor(index): string                               // hsl accent color
```

---

## Type Definitions

```typescript
interface BlockBroadcast {
  block: Block;
  sender: SystemNode;     // node that sends this broadcast
  rewardTx: Transaction;  // reward for the block's miner, to be included in the next block
  referrer: SystemNode;   // node the block came from (the miner, or the peer a relay received it from)
}

interface TransactionBroadcast {
  tx: Transaction;
  sender: SystemNode;
  referrer: SystemNode;
}
```

`src/blockchain/types.ts` additionally defines `LogLevel`, `LogCallback`, `BlockchainConfig`, `MinedBlockData`
and `SerializableTransaction` (the transaction shape sent to the mining worker).

---

## Usage Examples

### Creating a Blockchain and Mining

```typescript
import { Blockchain } from '~~/src/blockchain/blockchain';
import { Transaction } from '~~/src/blockchain/transaction';
import SmlCommon from '~~/src/common';

const blockchain = new Blockchain();
const genesisKey = SmlCommon.generateKeyPair(genesisPrivateKey); // key of blockchain.genesisAddress
const recipient = SmlCommon.HexToBase58(SmlCommon.generateKeyPair().getPublic(true, 'hex'));

const tx = new Transaction(blockchain.genesisAddress, recipient, 25);
tx.signTransaction(genesisKey);
blockchain.addTransaction(tx);

blockchain.minePendingTransactions(recipient, (block, rewardTx) => {
  if (block && blockchain.addBlock(block)) {
    blockchain.restorePendingTransactions([rewardTx!, ...blockchain.pendingTransactions]);
    console.log(blockchain.getBalanceOfAddress(recipient)); // 25
  }
});
```

### Creating a Multi-Node Network

```typescript
import { System } from '~~/src/network/system';
import { SystemNode } from '~~/src/network/system_node';

const system = new System();
system.start();

const alice = new SystemNode('Alice', system);
const bob = new SystemNode('Bob', system);
alice.connectToNode(bob);

alice.orderTransaction(alice.blockchain.genesisAddress, bob.address, 30, genesisKey);
alice.startMining(() => console.log('mined', alice.blockchain.getBlockchainLength()));
```

### Resolving a Chain Conflict

```typescript
const [conflict] = alice.getChainConflicts();
// { peerId: 'Bob', forkIndex: 1, ownLength: 2, peerLength: 2, retained: false }

alice.retainChain('Bob');   // keep Alice's chain until one of the chains changes
bob.adoptChain('Alice');    // or: Bob switches to Alice's chain
```

### Driving the Network Store

```typescript
import { createNetworkStore } from '~/composables/useNetwork';

const network = createNetworkStore();
network.start();
network.addNode('Alice');
network.addNode('Bob');
network.connect('Alice', 'Bob');
network.select('Alice');
network.startMining('Alice');

network.getChainConflicts('Alice').forEach(({ peerId }) => network.retainChain('Alice', peerId));
```

---

## Console Messages

Chain related messages of `SystemNode` (shown in the console pane):

| Level | Message |
| --- | --- |
| log | `⛓: Synchronized N missing blocks from Peer: a → b blocks` |
| log | `⛓: Adopted Peer's longer chain (longest-chain rule): a → b blocks, fork at block #i, n own blocks discarded[, k transactions returned to the pending pool]` |
| log | `⛓: Adopted Peer's chain: …` (user decision) |
| log | `⛓: Retained own chain (a blocks), ignoring Peer's conflicting chain (b blocks, fork at block #i)` |
| warn | `⛓: Chain conflict with Peer: chains fork at block #i (both a blocks \| own a blocks, Peer's b blocks). Keeping own chain, retain it or adopt Peer's chain in the explorer` |
| warn | `⛓: Rejected Peer's longer chain, it failed validation` |
| warn | `⛏: Mined block #i rejected, the chain changed while mining` |

Block (`🔗`), transaction (`⇄`) and block content (`📦`) messages come from `Blockchain`, `Transaction` and
`Block` validation.

---

## Error Handling

1. **Transaction rejected** – invalid signature, sender equals recipient, duplicate, or the balance (minus pending
   spends) does not cover the amount. `orderTransaction` / `sendTransaction` return `false`, a warning is logged
   and the node flashes.
2. **Block rejected** – already known, wrong position, wrong previous hash, invalid transactions or missing proof
   of work. A longer chain behind it is adopted; otherwise a fork is reported as a chain conflict.
3. **Chain validation failure** – `isChainValid` logs the first failing block.
4. **Mining failure** – no regular transaction pending, invalid pending pool, worker error or the 5 minute
   timeout: the callback receives `null`. A block mined on an outdated chain is rejected.
5. **Signing for another wallet** – `Transaction.signTransaction` throws.

---

## Related Documentation

- [README.md](README.md) – project overview and user guide
- [ARCHITECTURE.md](ARCHITECTURE.md) – system architecture and design
- [CHANGELOG.md](CHANGELOG.md) – release notes
