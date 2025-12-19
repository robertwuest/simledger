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

Interactive graph visualization of the network topology.

### Graph Library: Dracula

Dracula provides graph data structure and rendering:

- **Graph** - Container for nodes and edges
- **Layout Algorithms** - Spring, OrderedTree, TournamentTree
- **Renderers** - Raphael, SnapSVG (SVG-based rendering)

### Graph Components

#### Layout Algorithms

**Spring Layout** (`src/dracula/layout/spring.ts`)
- Force-directed graph layout
- Nodes repel each other, edges attract
- Iteratively settles into equilibrium

**OrderedTree Layout** (`src/dracula/layout/ordered_tree.ts`)
- Assumes perfect binary tree structure
- Positions nodes at fixed Y coordinates based on tree depth

**TournamentTree Layout** (`src/dracula/layout/tournament_tree.ts`)
- Alternative tree layout
- Used for tournament-style hierarchies

#### Renderers

**Raphael Renderer** (`src/dracula/renderer/raphael.ts`)
- Uses Raphael library for SVG rendering
- Creates draggable nodes
- Animates edges with bezier curves
- Supports directed graphs with arrows

**SnapSVG Renderer** (`src/dracula/renderer/snap.ts`)
- Alternative renderer using SnapSVG
- Similar functionality to Raphael

### Network Visualization Features

- **Node Representation** - Shows network participants
- **Edge Representation** - Shows connections between nodes
- **Interactive Dragging** - Move nodes around
- **Transaction Animation** - GSAP-animated objects flowing along edges
- **Real-time Updates** - New nodes and edges render immediately

## Application Layer

Vue 3 components for user interaction and dashboard.

### Main Components

#### App (`app/app.vue`)
- Root component
- Initializes demo network (Bob, Alice, Frank, Grace, Dave)
- Creates initial connections
- Demonstrates genesis transaction

#### Dashboard (`app/components/dashboard.vue`)
- Main layout with split panes
- Manages node collection
- Coordinates between components
- Handles transaction ordering

#### GraphViewer (`app/components/graphviewer.vue`)
- Renders network graph
- Manages graph layout and renderer
- Handles node/edge visualization
- Animates transactions with GSAP
- Supports context menus

#### NodeExplorer (`app/components/nodeexplorer.vue`)
- Displays selected node information
- Shows node's blockchain
- Lists pending transactions

#### NodeEditor (`app/components/nodeeditor.vue`)
- Allows creating new nodes
- Manages node connections
- Initiates transactions

### Data Flow

```
User Action (create node, send transaction)
    ↓
Vue Component emits event
    ↓
Dashboard processes event
    ↓
SystemNode instance created/updated
    ↓
Node's blockchain or network state changes
    ↓
GraphViewer observes changes
    ↓
Graph re-renders
    ↓
Vue updates UI
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

1. **Unit Tests** - Blockchain, Block, Transaction classes
2. **Integration Tests** - Multi-node network behavior
3. **Simulation Tests** - Long-running network scenarios

## Deployment

The application is built with Nuxt 4 and can be deployed as:
- **Static Site** - `nuxt generate` for static hosting
- **SSR** - `nuxt build` for server-side rendering
- **Development** - `nuxt dev` for local development
