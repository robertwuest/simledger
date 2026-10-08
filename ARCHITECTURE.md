# SimLedger Architecture

## Overview

SimLedger is a blockchain simulation and visualization application built with Vue 3, Nuxt 4, and TypeScript. The architecture is divided into four main layers:

1. **Blockchain Layer** - Cryptographic consensus and ledger
2. **Network Layer** - Multi-node simulation and message passing
3. **Visualization Layer** - Graph rendering and UI
4. **Application Layer** - Vue components and user interaction

## Blockchain Layer

The blockchain implementation provides the core proof-of-work consensus mechanism.

### Core Components

#### Blockchain (`src/blockchain/blockchain.ts`)
Main container for blocks and transactions using an account-based ledger model.

**Key Responsibilities:**
- Manages the chain of blocks
- Validates blocks before adding to chain
- Manages pending transactions queue
- Calculates address balances
- Provides consensus validation

**Key Methods:**
- `addBlock(block)` - Add and validate a new block
- `addTransaction(tx)` - Add transaction to pending queue
- `minePendingTransactions(address, callback)` - Mine a new block in a Web Worker
- `isChainValid()` - Validate entire chain integrity
- `getBalanceOfAddress(address)` - Calculate account balance

#### Block (`src/blockchain/block.ts`)
Immutable record of transactions with proof-of-work mining.

**Properties:**
- `previousHash` - Reference to previous block
- `timestamp` - Creation time
- `transactions` - Array of transactions
- `nonce` - Proof-of-work number
- `hash` - SHA256 hash of all block data

**Key Methods:**
- `generateHash(block)` - Compute block hash
- `mineBlock(block, difficulty, callback)` - Mine using Web Worker
- `hasValidTransactions(block, blockchain)` - Validate all transactions

#### Transaction (`src/blockchain/transaction.ts`)
Cryptographically signed value transfer.

**Properties:**
- `fromAddress` - Sender (Base58 encoded public key or '_' for rewards)
- `toAddress` - Recipient (Base58 encoded public key)
- `amount` - Transfer amount
- `signature` - ECDSA signature proof

**Key Methods:**
- `generateHash(tx)` - Create transaction identifier
- `signTransaction(tx, signingKey)` - Sign with private key (ECDSA secp256k1)
- `isValid(tx, blockchain)` - Validate signature

### Consensus Mechanism

**Proof-of-Work:**
- Difficulty: Number of leading zeros required in block hash
- Nonce: Incremented until hash matches difficulty threshold
- Mining: Performed in Web Worker to prevent UI blocking

**Balance Validation:**
- Account-based model (vs Bitcoin's UTXO model)
- Prevents double-spending by checking balance before accepting transactions
- Calculates balance by summing all transactions up to block index

## Network Layer

Simulates a peer-to-peer blockchain network with multiple nodes.

### Core Components

#### System (`src/network/system.ts`)
Simulation engine that drives all node updates via tick events.

**Key Responsibilities:**
- Emits regular tick events (default: 2000ms interval)
- Maintains synchronized simulation time across all nodes
- Allows starting/stopping the simulation

**RxJS Integration:**
- Uses BehaviorSubject for tick events
- Provides deterministic, event-driven simulation

#### SystemNode (`src/network/system_node.ts`)
Individual blockchain participant in the network.

**Key Responsibilities:**
- Manages own blockchain instance
- Connects to other nodes (peers)
- Broadcasts new transactions and blocks
- Handles mining with simulated mining delay
- Processes incoming messages from peers
- Generates ECDSA key pairs for transaction signing

**Key Properties:**
- `blockchain` - Own blockchain instance
- `address` - Public key (Base58 encoded)
- `keyPair` - ECDSA key pair for signing
- `connectedNodes` - List of peer connections
- `broadcastBlock` - Observable for new blocks
- `broadcastTransaction` - Observable for new transactions

**Peer Connection:**
- Bidirectional: connecting A→B also connects B→A
- Tracks inactive cycles for peer management
- Subscribes to peer's broadcast observables

#### Tick (`src/network/tick.ts`)
Event structure for simulation cycles.

```typescript
interface Tick {
  increment: number;    // Cycle counter
  elapsedTime: number;  // Cumulative time (ms)
}
```

### Message Flow

```
System.tick emitted
    ↓
SystemNode receives tick
    ↓
Node processes pending transactions
    ↓
Node attempts to mine (if miningDelay == 0)
    ↓
On block mined → broadcastBlock.next()
    ↓
Connected peers receive block via subscription
    ↓
Peer validates and adds block to chain
```

## Visualization Layer

Interactive graph visualization of the network topology, built on
[Vue Flow](https://vueflow.dev) – the Vue implementation of the React Flow (xyflow) model.

### State

**Network store** (`app/composables/useNetwork.ts`)
- `createNetworkStore()` creates the store, `provideNetwork()` provides it from `app.vue`, `useNetwork()` injects it
- Owns the `System`, the `SystemNode` instances, `selectedNodeId`, error flashes and the animation store
- `edges` are derived from the domain (`SystemNode.connectedNodes`) with a canonical id `A--B`, so the
  graph can never drift from the simulated network
- Domain objects stay raw (non-reactive); a `version` counter is bumped on every tick, node event and
  store action so views re-evaluate
- Routes node events: `BROADCAST_TX` / `BROADCAST_BLOCK` → packets, `MESSAGE` warnings → node error flash

**Broadcast animations** (`app/composables/useBroadcastAnimations.ts`)
- Packets `{ kind, fromId, toId, edgeId, startedAt, duration }` keyed by edge
- The store owns the lifecycle: packets expire after 2 s and are purged when an edge is removed

### Graph Components (`app/components/graph/`)

- **GraphViewer** – hosts `<VueFlow>` with background, controls, minimap and the toolbar panel.
  Vue Flow owns node positions; node ids and edges come from the store. Handles node click (select),
  `connect` (drag between handles) and edge removal (Backspace / Delete).
- **NetworkNode** – custom node: name, balance, mining state (gears, lottery die, progress bar),
  error flash, connection menu.
- **NetworkEdge** – floating bezier edge attaching to the node borders facing each other; renders the
  packets of its connection through `EdgeLabelRenderer`.
- **BroadcastPacket** – requestAnimationFrame loop sampling the live SVG path
  (`getPointAtLength`) with quad in-out easing and a fade-out over the last 40 %. Because the path
  is read every frame, packets follow edges while nodes are dragged or the view is zoomed.

### Helpers (`app/utils/graph/`)

- `spring-layout.ts` – force-directed layout (ported from the former Dracula spring layout) with an
  injectable random source for deterministic results
- `broadcast.ts` – `edgeId()` and `resolveBroadcastTargets()` (relays skip the edge back to the referrer)
- `motion.ts` – easing, opacity curve, progress and path sampling
- `floating-edge.ts` – edge end points on the node rectangles

## Application Layer

Vue 3 components for user interaction and dashboard.

### Scene Configuration

The application uses a declarative approach for scene setup:

#### Scene Definitions (`app/config/scenes.ts`)
- TypeScript interfaces for type-safe configuration:
  - `NodeConfig` - Node ID and role (genesis, validator, user)
  - `ConnectionConfig` - Bidirectional peer connections
  - `GenesisConfig` - Initial transaction settings (private key, recipient, amount)
  - `SceneConfig` - Complete scene definition with name, nodes, connections, and genesis
- Pre-configured scenes:
  - `defaultScene` - 5-node network (Bob, Alice, Frank, Grace, Dave) with interconnected topology
  - `simpleScene` - 3-node network (Alice, Bob, Charlie) for testing
- Easily extensible: add custom scenes by creating new `SceneConfig` objects

#### Scene Setup Composable (`app/composables/useSceneSetup.ts`)
- `initializeScene(config, network)` - Main initialization function
  - Creates all nodes from configuration in the network store
  - Establishes peer connections bidirectionally
  - Sets up genesis transaction with 1-second delay
  - Returns a function cancelling the pending genesis transaction
- Error handling for missing nodes or invalid connections

### Main Components

#### App (`app/app.vue`)
- Root component, provides the network store
- Starts the simulation and loads `defaultScene` through `useSceneSetup`
- Header with color mode toggle and info popup

#### Dashboard (`app/components/Dashboard.vue`)
- Layout with split panes: graph, explorer, console and editor

#### GraphViewer (`app/components/graph/GraphViewer.vue`)
- See [Visualization Layer](#visualization-layer)

#### NodeExplorer (`app/components/NodeExplorer.vue`)
- Node picker in the pane header, synchronised with the graph selection
- Summary of the selected node: wallet address (copyable), balance, chain height, pending count
- Collapsible sections: blocks (expandable to hash, previous hash, nonce, miner and transactions),
  pending transactions and the full ledger

#### NodeEditor (`app/components/NodeEditor.vue`)
- "New transaction" form (`UForm`) issued through the selected node: sender defaults to the node,
  swap button, inline validation, and a non-blocking warning when the amount exceeds the balance
- "Mining & validation": mine button enabled only with pending transfers, mining progress, and the
  chain validation result shown inline

#### Ledger building blocks (`app/components/ledger/`)
- `NodeDot` (node color shared with the graph), `AddressLabel` (node / genesis / reward / external
  address) and `TransactionItem`, used by explorer and editor for a consistent look

#### LogConsole (`app/components/LogConsole.vue`)
- Live log messages of all nodes (max. 400 entries)

### Data Flow

```
User action (graph, editor, toolbar)
    ↓
Network store action (connect, sendTransaction, startMining, ...)
    ↓
SystemNode / Blockchain state changes, events on node.eventEmitter
    ↓
Store bumps `version`, launches broadcast packets, flashes warnings
    ↓
Vue re-renders nodes, edges, explorer and packets
```

## Utilities

### Common (`src/common.ts`)

Cryptographic utilities for the entire system:

**Cryptography:**
- `generateKeyPair(privateKey?)` - Create ECDSA secp256k1 keys
- `HexToBase58(hex)` - Convert hex hash to Base58 string
- `Base58ToHex(base58)` - Convert Base58 back to hex

**Utilities:**
- `generateTimestamp()` - Get current timestamp
- `generateNonce()` - Generate unique transaction nonce
- `RandomSeed(min, max, seed)` - Seeded random number generation

## Cryptography

### Elliptic Curve: secp256k1
- Standard elliptic curve for Bitcoin/Ethereum
- 256-bit keys
- ECDSA signatures
- Public key = compressed 33-byte format, Base58 encoded

### Hashing
- SHA256 for block and transaction hashing
- Base58 encoding for human-readable addresses

### Key Encoding
- **Addresses** - Base58 encoded compressed public keys (33 bytes)
- **Signatures** - DER format hex encoded
- **Hashes** - Base58 encoded

## Performance Considerations

### Scalability Issues

1. **Balance Calculation** - O(n) where n = total transactions
   - Scans entire chain for each balance query
   - Better approach: maintain account UTXO model

2. **Chain Validation** - O(n)
   - Validates every block's hash and transactions
   - Use Merkle tree for faster validation

3. **Mining** - CPU intensive
   - Mitigated by Web Worker
   - Adjustable difficulty

### Optimization Opportunities

1. Use UTXO model for balances (like Bitcoin)
2. Implement Merkle trees for block transactions
3. Cache balance calculations
4. Use binary search for block lookups
5. Lazy load large transaction lists

## Thread Safety

### Web Workers

Mining runs in a separate Web Worker thread to prevent UI blocking:

```
Main Thread (UI)
    ↓
Request mining in Worker
    ↓
Worker Thread (compute)
    ↓
Return mined block to Main Thread
```

### RxJS Observables

All network communication uses RxJS BehaviorSubjects for thread-safe event emission.

## Testing Strategy

The test pyramid follows the Nuxt / Vue tooling:

1. **Unit tests** (`test/unit`, Vitest, Node) – pure graph helpers, the network and animation stores,
   scene setup and the blockchain / network domain. Mining runs the real `public/js/mining.js` inside a
   fake Worker; the simulation clock is driven with fake timers.
2. **Component tests** (`test/nuxt`, Vitest + `@nuxt/test-utils` + Vue Test Utils, happy-dom) – every
   component mounted in the Nuxt runtime against a provided network store. The packet animation is
   tested frame by frame with a mocked `requestAnimationFrame` and a stub SVG path.
3. **End-to-end tests** (`test/e2e`, Playwright, Chromium) – the statically generated site served under
   the GitHub Pages base path, covering interactions that need real layout: dragging, handle connections,
   edge selection and packets travelling along rendered edges.

Coverage thresholds are enforced per area in `vitest.config.ts`; CI (`.github/workflows/test.yml`) runs
type checking, unit and component tests with coverage, and the E2E suite.

## Deployment

The application is built with Nuxt 4 and can be deployed as:
- **Static Site** - `nuxt generate` for static hosting
- **SSR** - `nuxt build` for server-side rendering
- **Development** - `nuxt dev` for local development
