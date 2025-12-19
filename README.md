# SimLedger - Blockchain Simulation & Visualization

A Vue 3 + Nuxt 4 + TypeScript application for simulating and visualizing blockchain networks with an interactive graph-based node editor.

## Overview

**SimLedger** is an educational blockchain simulator that allows users to:
- Create and manage network nodes representing blockchain participants
- Visualize network topology and data flow in real-time
- Simulate cryptocurrency transactions across the network
- Monitor blockchain state and transaction history
- Interact with the network through an intuitive UI

## Project Structure

```
simledger/
├── app/                          # Vue 3 frontend application
│   ├── app.vue                   # Root component
│   └── components/               # Vue components
│       ├── dashboard.vue         # Main dashboard layout
│       ├── graphviewer.vue       # Network graph visualization
│       ├── nodeexplorer.vue      # Node information panel
│       └── nodeeditor.vue        # Node editing interface
├── src/
│   ├── blockchain/               # Blockchain core logic
│   │   ├── blockchain.ts         # Main blockchain class
│   │   ├── block.ts              # Block structure and mining
│   │   └── transaction.ts        # Transaction handling
│   ├── network/                  # Network simulation
│   │   ├── system.ts             # Main simulation loop
│   │   ├── system_node.ts        # Individual node representation
│   │   └── tick.ts               # Tick/cycle event structure
│   ├── dracula/                  # Graph visualization library
│   │   ├── dracula.ts            # Core graph data structure
│   │   ├── layout/               # Layout algorithms
│   │   │   ├── layout.ts         # Base layout class
│   │   │   ├── spring.ts         # Spring layout algorithm
│   │   │   ├── ordered_tree.ts   # Tree layout algorithm
│   │   │   └── tournament_tree.ts# Tournament tree layout
│   │   └── renderer/             # SVG rendering engines
│   │       ├── renderer.ts       # Base renderer class
│   │       ├── raphael.ts        # Raphael renderer
│   │       └── snap.ts           # Snap SVG renderer
│   └── common.ts                 # Shared utilities & crypto helpers
├── assets/                       # Static assets
├── public/                       # Public files
└── nuxt.config.ts               # Nuxt configuration
```

## Technology Stack

- **Frontend**: Vue 3, Nuxt 4, TypeScript
- **Blockchain**: SHA256 hashing, secp256k1 elliptic curve cryptography
- **Visualization**: Raphael/SnapSVG for graph rendering, GSAP for animations
- **State Management**: RxJS for reactive system events
- **UI Components**: Nuxt UI, SplitPanes for responsive layouts

## Key Features

### Blockchain System
- Proof-of-Work consensus mechanism
- SHA256-based block hashing
- Transaction validation with elliptic curve signatures
- Mining reward system

### Network Simulation
- Multi-node network topology
- Real-time transaction broadcasting
- Node state management
- Configurable simulation cycle time (default: 2000ms)

### Visualization
- Interactive graph-based network view
- Animated transaction flow between nodes
- Node property inspector
- Real-time state updates

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production Build

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

## Core Concepts

### Blockchain Architecture
The blockchain implementation is based on Xavier Decuyper's architecture. Key components:
- **Blockchain**: Container for blocks and transactions
- **Block**: Contains transactions, timestamp, nonce, and hash
- **Transaction**: Represents value transfer with cryptographic signatures

### Network System
The simulation operates on a tick-based system:
- Fixed cycle time (2000ms by default)
- RxJS BehaviorSubject for reactive updates
- Each node maintains its own blockchain state

### Graph Visualization
Uses the Dracula graph library with:
- Multiple layout algorithms (Spring, OrderedTree, TournamentTree)
- Raphael/SnapSVG rendering engines
- Interactive node dragging and connection management

## API Documentation

See [API_REFERENCE.md](API_REFERENCE.md) for detailed API documentation.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## Contributing

This is an educational project designed to demonstrate blockchain concepts and network visualization.

## License

MIT
