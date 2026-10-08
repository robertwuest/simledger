# SimLedger Architecture

## Overview

SimLedger is a blockchain simulation and visualization application built with Vue 3, Nuxt 4 and TypeScript.
It is organised in four layers:

1. **Blockchain Layer** (`src/blockchain/`) – ledger, proof of work, validation
2. **Network Layer** (`src/network/`) – simulation clock, nodes, gossip and consensus between nodes
3. **Visualization Layer** (`app/components/graph/`, `app/utils/graph/`) – graph rendering and animations
4. **Application Layer** (`app/`) – network store, panes and user interaction

The first two layers are framework-free TypeScript and are tested in plain Node. The UI never mutates domain
objects directly; it calls actions of the network store.

## Blockchain Layer

### Blockchain (`src/blockchain/blockchain.ts`)
One node's copy of the ledger.

**Responsibilities:**
- Holds the chain of blocks and the pending transaction pool
- Validates blocks (`addBlock`) and transactions (`addTransaction`) before accepting them
- Mines pending transactions into a new block (`minePendingTransactions`, Web Worker)
- Validates the whole chain (`isChainValid`)
- Compares and replaces chains (`getForkIndex`, `replaceChain`) and rebuilds the pending pool after a chain
  change (`restorePendingTransactions`)
- Forwards log messages to subscribers (`registerLogSubscriber`), which the node turns into console entries

**Defaults:** difficulty 1, mining reward 10, genesis block paying 100 coins to the genesis wallet.

### Block (`src/blockchain/block.ts`)
An immutable record of transactions.

- `previousHash`, `length` (1-based position), `timestamp`, `transactions`, `rewardAddress` (miner),
  `previousRewardAddress` (miner of the previous block), `nonce`, `hash`
- `generateHash()` – SHA256 over previous hash, length, timestamp, transaction hashes, reward address and nonce
- `mineBlock(difficulty, callback)` – proof of work in the `public/js/mining.js` Web Worker (5 min timeout)
- `hasValidTransactions(blockchain)` – exactly one reward to the previous miner, valid signatures, no overspend,
  at least one regular transfer

The UI numbers blocks from `#0` (genesis), i.e. by their index in the chain (`length - 1`).

### Transaction (`src/blockchain/transaction.ts`)
A signed value transfer.

- `fromAddress` (Base58 public key, or `_` for a mining reward), `toAddress`, `amount`, `nonce`, `timestamp`,
  `signature`
- `generateHash()` – SHA256 over all fields except the signature (hex)
- `signTransaction(key)` – ECDSA secp256k1, refuses keys of other wallets
- `isValid(blockchain)` – signature check; balances are checked by the blockchain

### AccountStateManager (`src/blockchain/account-state.ts`)
Balances of all addresses.

- Current balances (O(1) lookups) plus a snapshot and a Merkle state root per block hash
- `applyBlock()` after a block is added, `revertToBlock()` for truncation, `canSpend()` including pending spends
- Historical lookups (`getBalanceAtBlock`) are used to validate a block against the state of its parent

### Consensus Rules

**Proof of work:** a block hash must start with `difficulty` zeros; the worker increments the nonce until it
does. To make mining visible, `SystemNode.startMining` adds a random delay of 0–5 ticks (the "lottery die").

**Rewards:** the miner of block *n* is paid by a reward transaction in block *n + 1*. After mining, a node puts
the reward for its own block at the top of its pending pool, and peers take it over from the block broadcast.

**Balances:** account model (not UTXO). A transfer is accepted if the sender's balance minus its pending spends
covers it; a block is valid if no sender overspends relative to the parent block's state.

## Network Layer

### System (`src/network/system.ts`)
The simulation clock. `start()` emits a `Tick { increment, elapsedTime }` every `System.CycleTime` (2000 ms)
through an RxJS `BehaviorSubject`; `stop()` pauses it.

### SystemNode (`src/network/system_node.ts`)
A network participant.

**State:** `id`, key pair and Base58 `address`, own `blockchain`, `connectedNodes`, mining state
(`isMining`, `miningDelay`), and two broadcast subjects (`broadcastBlock`, `broadcastTransaction`) its peers
subscribe to. `eventEmitter` publishes node events for the UI:

| Event | Emitted when |
| --- | --- |
| `BROADCAST_TX` / `BROADCAST_BLOCK` | The node sends or relays a transaction / block (drives packet animations) |
| `START_MINING` | Mining started |
| `MESSAGE` | A log message (`log`, `warn`, `error`); warnings flash the node |
| `CHAIN_CONFLICT` | A conflict with a peer was detected and logged |
| `CHAIN_ADOPTED` | The node switched to a peer's chain (longest-chain rule or user decision) |
| `CHAIN_RETAINED` | The user decided to keep the node's chain in a conflict |

**Tick queue:** sends are queued and executed on the next tick (`pushToTickQueue`), so every hop takes one
cycle. A mined block is queued with the mining delay.

**Peer connections:** `connectToNode()` is bidirectional. Subscribing to a `BehaviorSubject` replays the peer's
latest broadcast, so two nodes compare their chains immediately when they connect.

### Message Flow

```
User orders a transaction (store → SystemNode.orderTransaction)
    ↓ Blockchain.addTransaction validates and pools it
Next tick: broadcastTransaction.next()
    ↓ Peers validate, pool and relay it on their next tick (not back to the referrer)
User mines (store → SystemNode.startMining)
    ↓ Web Worker proof of work, plus 0–5 ticks lottery delay
Block added to the own chain → broadcastBlock.next()
    ↓ Peers run onNewBlock (see below) and relay accepted blocks
```

### Fork Handling and Chain Conflicts

Nodes mine independently, so two nodes can extend the same parent with different blocks (e.g. when the
network is split or two nodes finish mining in the same cycle). From then on their chains diverge – a fork.

**Incoming block (`SystemNode.onNewBlock`):**

```
addBlock(block) succeeds?
├─ yes → rebuild pending pool, relay the block
└─ no  → sender's chain longer?
         ├─ yes → switchChain(sender, 'longest-chain')
         │        ├─ valid   → log "Adopted … longer chain" / "Synchronized … missing blocks", relay
         │        └─ invalid → log "Rejected … longer chain" (warn), keep own chain
         └─ no  → chains diverge? → reportConflict(sender): log "Chain conflict …" (warn) once
```

`connectToNode()` suppresses conflict reports while both nodes process each other's replayed broadcasts, and
reports a remaining fork once both applied the longest-chain rule – a fork that resolves itself on connect is
not reported.

**Conflict detection (`getChainConflicts`):** for every connected peer the node computes the fork index
(`Blockchain.getForkIndex`, first block whose hash differs). A peer that is only ahead or behind – one chain is a
prefix of the other – is not in conflict. Each `ChainConflict` carries `peerId`, `forkIndex`, both lengths and
whether the node `retained` its chain.

**Switching chains (`switchChain`, used by the longest-chain rule and by `adoptChain`):**
1. `Blockchain.replaceChain()` replays the peer's chain on a fresh blockchain (silent validation). Only a fully
   valid chain replaces the chain and the account state; otherwise nothing changes.
2. The blocks after the fork index are the discarded own blocks.
3. `restorePendingTransactions()` rebuilds the pool from the peer's pool, the transfers of the discarded blocks
   and the own pool. Confirmed, duplicated and no longer valid transactions are dropped; a reward for the new
   latest block's miner is ensured.
4. A console message summarises the switch (lengths, fork block, discarded blocks, re-queued transactions).

**User decisions:**
- `retainChain(peerId)` stores the decision together with the latest block hashes of both chains. It stays in
  effect until one of the chains changes; a longer chain arriving later is still adopted automatically.
- `adoptChain(peerId)` switches to the peer's chain regardless of its length and broadcasts the new latest block
  to the other peers, who apply the same rules.
- Decisions are per node; the peer keeps its conflict until it decides itself. They are forgotten when the
  connection is removed.

**Stale mining:** a block mined on top of an outdated latest block is rejected by `addBlock`; the node stops
mining and logs a warning. The block being mined holds a copy of the pending pool, so transactions arriving
while mining stay pending for the next block.

## Visualization Layer

Interactive graph of the network topology, built on [Vue Flow](https://vueflow.dev) – the Vue
implementation of the React Flow (xyflow) model.

### Graph Components (`app/components/graph/`)

- **GraphViewer** – hosts `<VueFlow>` with background, controls, minimap and the toolbar panel.
  Vue Flow owns node positions; node ids and edges come from the store. Handles node click (select),
  `connect` (drag between handles) and edge removal (Backspace / Delete). Re-fits the view on pane resizes
  until the user pans or zooms.
- **NetworkNode** – custom node: name, balance, mining state (gears, lottery die, progress bar),
  warning flash, chain conflict icon and dashed border, connection menu.
- **NetworkEdge** – floating bezier edge attaching to the node borders facing each other; amber and dashed
  while the two nodes have an undecided chain conflict; renders the packets of its connection through
  `EdgeLabelRenderer`.
- **BroadcastPacket** – requestAnimationFrame loop sampling the live SVG path
  (`getPointAtLength`) with quad in-out easing and a fade-out over the last 40 %. Because the path
  is read every frame, packets follow edges while nodes are dragged or the view is zoomed.
- **ConnectionMenu** / **GraphToolbar** – peer checkboxes per node; add node, auto layout, fit view, pause.

### Helpers (`app/utils/graph/`)

- `spring-layout.ts` – force-directed layout with an injectable random source for deterministic results
- `broadcast.ts` – `edgeId()` and `resolveBroadcastTargets()` (relays skip the edge back to the referrer)
- `motion.ts` – easing, opacity curve, progress and path sampling
- `floating-edge.ts` – edge end points on the node rectangles
- `colors.ts` – accent color per node, shared by graph, explorer and editor

## Application Layer

### State

**Network store** (`app/composables/useNetwork.ts`)
- `createNetworkStore()` creates the store, `provideNetwork()` provides it from `app.vue`, `useNetwork()`
  injects it
- Owns the `System`, the `SystemNode` instances, `selectedNodeId`, warning flashes and the animation store
- `edges` are derived from `SystemNode.connectedNodes` with a canonical id `A--B`, so the graph can never drift
  from the simulated network; `conflictEdgeIds` marks the edges with an undecided chain conflict
- Domain objects stay raw (non-reactive); a `version` counter is bumped on every tick (and 50 ms later, after
  the nodes processed their queues), node event and store action so views re-evaluate
- Routes node events: `BROADCAST_TX` / `BROADCAST_BLOCK` → packets, `MESSAGE` warnings → node flash
- Actions: connect / disconnect, select, transactions, mining, chain validation, `adoptChain` / `retainChain`

**Broadcast animations** (`app/composables/useBroadcastAnimations.ts`)
- Packets `{ kind, fromId, toId, edgeId, startedAt, duration }` keyed by edge
- The store owns the lifecycle: packets expire after 2 s and are purged when an edge is removed

### Scene Configuration

- **Scene definitions** (`app/config/scenes.ts`): `SceneConfig` with nodes, connections and an optional
  genesis transaction (`GenesisConfig`: private key of the genesis wallet, recipient, amount).
  Presets: `defaultScene` (Bob, Alice, Frank, Grace, Dave) and `simpleScene` (Alice, Bob, Charlie).
- **Scene setup** (`app/composables/useSceneSetup.ts`): `initializeScene(config, network)` creates the nodes
  and connections and orders the genesis transaction after `GENESIS_DELAY` (1 s); it returns a function that
  cancels the pending genesis transaction.

### Components

- **App** (`app/app.vue`) – provides the network store, starts the simulation, loads `defaultScene`; header
  with color mode toggle and info popup (version, press `o`)
- **Dashboard** – split panes: graph, explorer, console, editor
- **NodeExplorer** – node picker synchronised with the graph selection; summary (address, balance, blocks,
  pending); chain conflict panels with *Retain own chain* / *Adopt …'s chain* (undecided conflicts first,
  retained ones still offer to adopt); blocks newest first with a **Fork** badge on own blocks after the fork
  index, expandable to hash, previous hash, nonce, time, miner and transactions; pending pool; ledger
- **NodeEditor** – transaction form issued through the selected node (sender defaults to the node, swap,
  inline validation, non-blocking balance warning); mining (enabled with pending transfers) and chain
  validation shown inline
- **LogConsole** – log messages of all nodes (max. 400 entries, color coded by level, clear button)
- **Ledger building blocks** (`app/components/ledger/`) – `NodeDot`, `AddressLabel` (node / genesis / reward /
  external address) and `TransactionItem`

### Data Flow

```
User action (graph, explorer, editor, toolbar)
    ↓
Network store action (connect, sendTransaction, startMining, adoptChain, retainChain, ...)
    ↓
SystemNode / Blockchain state changes, events on node.eventEmitter
    ↓
Store bumps `version`, launches broadcast packets, flashes warnings
    ↓
Vue re-renders nodes, edges, explorer, console and packets
```

## Utilities

### Common (`src/common.ts`)

- `generateKeyPair(privateKey?)` – ECDSA secp256k1 key pair, optionally imported from a Base58 private key
- `HexToBase58(hex)`, `Base58ToHex(base58)`, `BufferFromHex(hex)`, `Uint8ArrayToHex(bytes)`
- `generateTimestamp()`, `generateNonce()`, `RandomSeed(min, max, seed)`

## Cryptography

- **Curve**: secp256k1 (as Bitcoin / Ethereum), ECDSA signatures in DER hex
- **Addresses**: Base58 encoded compressed public keys (33 bytes)
- **Hashes**: SHA256 hex for blocks and transactions

## Performance Considerations

| Operation | Cost |
| --- | --- |
| Balance lookup (current or at a block) | O(1) via `AccountStateManager` |
| `addBlock` | O(m), m = transactions in the block |
| `isChainValid` | O(n × m) over all blocks |
| Fork index / conflict check per peer | O(n) hash comparisons |
| `replaceChain` | O(n × m), replays the candidate chain |

Every block keeps a balance snapshot; `pruneOldStates(n)` limits them for long runs. Mining runs in a Web
Worker so the UI stays responsive. Possible improvements: Merkle trees for transactions, persistent chain
storage, incremental chain comparison.

## Concurrency

- **Web Workers**: proof of work runs off the main thread; the result is applied on a later tick
- **RxJS**: ticks, broadcasts and node events are synchronous subjects on the main thread; the tick queue
  serialises sends, so a node never relays a message in the same cycle it received it

## Testing Strategy

1. **Unit tests** (`test/unit`, Vitest, Node) – graph helpers, the network and animation stores, scene setup and
   the blockchain / network domain, including chain replacement, the longest-chain rule and chain conflicts.
   Mining runs the real `public/js/mining.js` inside a fake Worker; the simulation clock is driven with fake
   timers.
2. **Component tests** (`test/nuxt`, Vitest + `@nuxt/test-utils` + Vue Test Utils, happy-dom) – every component
   mounted in the Nuxt runtime against a provided network store. The packet animation is tested frame by frame
   with a mocked `requestAnimationFrame` and a stub SVG path.
3. **End-to-end tests** (`test/e2e`, Playwright, Chromium) – the statically generated site served under the
   GitHub Pages base path, covering interactions that need real layout and timing: dragging, handle
   connections, edge selection, packets travelling along rendered edges and a split network resolving a fork.

Coverage thresholds are enforced per area in `vitest.config.ts`; CI (`.github/workflows/test.yml`) runs type
checking, unit and component tests with coverage, and the E2E suite.

## Deployment

Built with Nuxt 4 and deployable as:
- **Static site** – `nuxt generate` (GitHub Pages, see `.github/workflows/deploy.yml`)
- **SSR** – `nuxt build`
- **Development** – `nuxt dev`
