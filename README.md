# SimLedger - Blockchain Simulation & Visualization

<div align="center">
  <img src="./public/img/logo.png" alt="SimLedger Logo" />
</div>

**Version**: 0.1.0-alpha.1

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
│   ├── components/               # Vue components
│   │   ├── Dashboard.vue         # Main dashboard layout (split panes)
│   │   ├── NodeExplorer.vue      # Blockchain explorer of the selected node
│   │   ├── NodeEditor.vue        # Transaction and mining controls
│   │   ├── LogConsole.vue        # Node log viewer
│   │   └── graph/                # Vue Flow network graph
│   │       ├── GraphViewer.vue   # Vue Flow canvas, toolbar, controls, minimap
│   │       ├── NetworkNode.vue   # Custom node (balance, mining state, menu)
│   │       ├── NetworkEdge.vue   # Floating edge rendering broadcast packets
│   │       ├── BroadcastPacket.vue # Packet animated along an edge
│   │       ├── ConnectionMenu.vue  # Connect / disconnect peers
│   │       └── GraphToolbar.vue  # Add node, layout, fit view, pause
│   ├── composables/              # Vue composables
│   │   ├── useNetwork.ts         # Network store (nodes, edges, selection, actions)
│   │   ├── useBroadcastAnimations.ts # Packets travelling along edges
│   │   └── useSceneSetup.ts      # Scene initialization logic
│   ├── utils/                    # Framework-free helpers
│   │   └── graph/                # Layout, broadcast routing, motion, edge geometry
│   └── config/                   # Scene configurations
│       └── scenes.ts             # Scene presets and definitions
├── src/
│   ├── blockchain/               # Blockchain core logic
│   │   ├── blockchain.ts         # Main blockchain class
│   │   ├── block.ts              # Block structure and mining
│   │   └── transaction.ts        # Transaction handling
│   ├── network/                  # Network simulation
│   │   ├── system.ts             # Main simulation loop
│   │   ├── system_node.ts        # Individual node representation
│   │   └── tick.ts               # Tick/cycle event structure
│   └── common.ts                 # Shared utilities & crypto helpers
├── assets/                       # Static assets
├── public/                       # Public files
└── nuxt.config.ts               # Nuxt configuration
```

## Technology Stack

- **Frontend**: Vue 3, Nuxt 4, TypeScript
- **Blockchain**: SHA256 hashing, secp256k1 elliptic curve cryptography
- **Visualization**: [Vue Flow](https://vueflow.dev) (Vue port of the React Flow / xyflow model) for the network graph, requestAnimationFrame-driven packet animations
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
- Interactive graph-based network view with zoom, pan, minimap and fit view
- Drag between node handles to connect peers, select an edge and press Backspace to disconnect
- Animated transaction / block flow along the edges, following nodes while they are dragged
- Light / dark mode toggle
- Node property inspector
- Real-time state updates

### Scene Configuration
- Declarative scene definitions with TypeScript interfaces
- Multiple pre-configured network presets (default, simple)
- Easy-to-modify network topology and genesis settings
- Vue composable pattern for scene initialization

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

## Static Site Generation

Generate a static version of the application for deployment:

```bash
# npm
npm run generate

# pnpm
pnpm generate

# yarn
yarn generate

# bun
bun run generate
```

The static files will be generated in `.output/public` and can be deployed to any static hosting service.

## Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. The deployment workflow:

1. Builds the static site using `npm run generate`
2. Uploads the generated files to GitHub Pages
3. Makes the site available at `https://<username>.github.io/simledger/`

To trigger a manual deployment, go to the Actions tab in GitHub and run the "Deploy to GitHub Pages" workflow.

## Testing

| Command | What it runs |
| --- | --- |
| `npm test` | All Vitest projects (unit + component) |
| `npm run test:unit` | Framework-free tests in Node: graph helpers, stores, blockchain / network domain |
| `npm run test:nuxt` | Component and composable tests in the Nuxt runtime (happy-dom, `@nuxt/test-utils`) |
| `npm run test:coverage` | All Vitest projects with V8 coverage and thresholds |
| `npm run test:e2e` | Playwright end-to-end tests against the generated site served under `/simledger/` |
| `npm run typecheck` | `vue-tsc` over the app and the tests |

Tests live in `test/`:

- `test/unit/` – spring layout, broadcast routing, motion / easing, floating edges, network and animation stores,
  scene setup, transactions, blockchain mining (the real `public/js/mining.js` runs in a fake Worker) and `SystemNode` broadcasting
- `test/nuxt/` – components mounted with `mountSuspended`: node card, connection menu, edge and packet animation
  (mocked `requestAnimationFrame` and path sampling), graph viewer, toolbar, explorer, editor, console, dashboard
- `test/e2e/` – the running app: default scene, selection sync, connecting / disconnecting (menu, handle drag, Backspace),
  dragging, toolbar, color mode, packets travelling and being relayed, packets following a dragged node, mining,
  rejected transactions and reduced motion

The E2E suite builds the site itself (`npm run e2e:build`) unless a server is already running on port 4173.
Install the browser once with `npx playwright install chromium`, or point `PLAYWRIGHT_CHROMIUM_EXECUTABLE` at an existing Chromium.

## Dependency Audit

Dependencies are kept current with `npm audit fix`. The remaining `npm audit` findings have no patched
release within the version ranges their parents allow. All of them except `elliptic` are build or
development tooling that never ships with the statically generated site:

| Package | Severity | Pulled in by | Status |
| --- | --- | --- | --- |
| `simple-git`, `@simple-git/argv-parser` | critical | `@nuxt/devtools` (dev only) | Fixed only in simple-git 4 / argv-parser 2; devtools 3.x requires simple-git ^3 |
| `node-forge` | high | `@nuxt/cli` → `listhen` (dev server HTTPS) | No patched release |
| `braces` (→ `micromatch`, `fast-glob`, `globby`) | high | `nitropack` (build) | No patched release |
| `esbuild` 0.27 | low | `@nuxt/fonts` → `fontless` (dev server) | Fixed in 0.28, outside the parent's range |
| `elliptic` | low | wallet keys and signatures (`src/common.ts`) | No patched release; accepted for this educational simulator, which handles no real funds |

The intermediate packages `npm audit` lists (`nuxt`, `@nuxt/cli`, `@nuxt/devtools`, `@nuxt/nitro-server`,
`@nuxt/vite-builder`, `@nuxt/test-utils`, `nitropack`, `listhen`) are only flagged because they depend on
the packages above. Re-check with `npm audit` when Nuxt publishes updates.

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
Built on Vue Flow (`@vue-flow/core`):
- The network store (`useNetwork`) is the single source of truth; Vue Flow nodes and edges are derived from it
- Custom `network` node and floating `network` edge types
- Spring (force-directed) auto layout (`app/utils/graph/spring-layout.ts`)
- Broadcast packets are sampled from the live edge path every animation frame and honor `prefers-reduced-motion`

### Scene Configuration
Declarative scene setup using Vue composables:
- **Scene Definitions** (`app/config/scenes.ts`): Define network topology, nodes, connections, and genesis transactions as configuration objects
- **Scene Composable** (`app/composables/useSceneSetup.ts`): Handles scene initialization from configuration
- **Presets**: Built-in scenes (default 5-node network, simple 3-node network)
- Easy to create custom scenes by adding new configuration objects

## API Documentation

See [API_REFERENCE.md](API_REFERENCE.md) for detailed API documentation.

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## Contributing

This is an educational project designed to demonstrate blockchain concepts and network visualization.

## License

MIT
