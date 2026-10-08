# SimLedger - Blockchain Simulation & Visualization

<div align="center">
  <img src="./public/img/logo.png" alt="SimLedger Logo" />
</div>

**Version**: 0.1.1-alpha.1 · [Changelog](CHANGELOG.md)

An educational blockchain simulator built with Vue 3, Nuxt 4 and TypeScript. Build a peer-to-peer network
of nodes in an interactive graph, send signed transactions, mine blocks with proof of work and watch
transactions, blocks and forks spread through the network.

## Overview

With **SimLedger** you can:

- Create network nodes, each running its own blockchain, wallet and pending transaction pool
- Connect and disconnect peers and watch transactions and blocks travel along the connections
- Sign transactions with real secp256k1 keys and mine them into blocks with proof of work
- Inspect every node's chain, pending pool and ledger, and validate the chain
- Split the network, let both sides mine and see how nodes deal with diverging chains (forks):
  the longest-chain rule decides automatically, conflicts it cannot decide are resolved by you

## Using the Simulator

The dashboard has four panes, all synchronised through one shared network store:

| Pane | What you can do |
| --- | --- |
| **Graph Viewer** | Select nodes, drag them, connect peers by dragging between node handles or via the connection menu (cable icon) on the node card, select an edge and press Backspace / Delete to disconnect. The toolbar adds nodes, re-runs the auto layout, fits the view and pauses / resumes the simulation. |
| **Explorer** | Inspect the selected node: wallet address (copyable), balance, chain height, pending count, chain conflicts, the blocks (expandable), the pending pool and the full ledger. |
| **Console** | Log messages of all nodes: accepted and rejected blocks and transactions, chain validation, chain switches and conflicts. |
| **Editor** | Send a transaction between two wallets through the selected node, mine the pending transactions into a block and validate the chain. |

The default scene creates five nodes (Bob, Alice, Frank, Grace, Dave). One second after start the genesis
wallet sends 100 coins to Bob; select Bob and press **Mine block** to confirm it.

### Simulation Cycle

The network runs in ticks of 2 seconds (`System.CycleTime`). A node relays a received transaction or block
on the next tick, so packets visibly hop from node to node. Mining rolls a lottery die (0–5 extra ticks)
on top of the proof of work, so two nodes mining at the same time finish at different moments.

### Forks and Chain Conflicts

Every node keeps its own copy of the chain. Whenever a node learns about a chain that differs from its own,
it applies the **longest-chain rule**:

| Situation | What the node does | Console feedback |
| --- | --- | --- |
| The block extends the own chain | Adds it and relays it | `🔗: Block added …` |
| The peer's chain is longer and only adds blocks | Copies the missing blocks | `⛓: Synchronized 2 missing blocks from Alice: 1 → 3 blocks` |
| The peer's chain is longer and diverges | Switches to it, returns transfers of discarded blocks to the pending pool | `⛓: Adopted Alice's longer chain (longest-chain rule): 2 → 3 blocks, fork at block #1, 1 own block discarded, 1 transaction returned to the pending pool` |
| The peer's chain is longer but invalid | Keeps its own chain | `⛓: Rejected Alice's longer chain, it failed validation` (warning) |
| The peer's chain diverges and is not longer | Keeps its own chain and reports a **chain conflict** | `⛓: Chain conflict with Alice: chains fork at block #1 (both 2 blocks) …` (warning) |
| The node finished mining on an outdated chain | Drops the mined block | `⛏: Mined block #1 rejected, the chain changed while mining` (warning) |

A chain conflict is shown in three places:

- **Graph**: the edge between the two nodes turns into an amber dashed line, the node card gets a fork icon
  and a dashed border
- **Explorer** of each involved node: a *Chain conflict with …* panel that names the fork block and both
  chain lengths, and the own blocks that are not part of the peer's chain carry a **Fork** badge
- **Console**: one warning per conflict and state of both chains

Each node decides on its own, using the buttons in its Explorer panel:

- **Retain own chain** – keep the own chain. The decision holds until one of the two chains changes; a longer
  chain arriving later is still adopted automatically. The panel stays visible (*Keeping own chain over …*)
  and still offers to adopt the peer's chain.
- **Adopt *peer*'s chain** – validate the peer's chain and switch to it, even if it is shorter. Transfers of
  the discarded own blocks go back into the pending pool and the node broadcasts its new latest block to its
  other peers.

The edge stays marked until both nodes have decided. To provoke a conflict in the default scene: wait until
Alice has received the genesis transaction, disconnect Bob and Alice, mine a block on both, then connect them
again.

## Key Features

### Blockchain
- Proof-of-work consensus with SHA256 block hashing, mining in a Web Worker
- Account-based ledger with O(1) balance lookups and per-block state snapshots (`AccountStateManager`)
- ECDSA secp256k1 transaction signatures, balance and double-spend checks, mining rewards
- Chain validation, safe chain replacement and pending pool reconciliation after chain switches

### Network Simulation
- Multi-node topology with bidirectional peer connections
- Tick-based gossip: transactions and blocks are relayed hop by hop
- Longest-chain rule with console feedback, chain conflict detection and manual resolution (retain / adopt)
- Configurable simulation cycle time (default: 2000 ms), pause and resume

### Visualization
- Interactive Vue Flow graph with zoom, pan, minimap, fit view and spring auto layout
- Animated transaction and block packets that follow the edges while nodes are dragged
- Mining state (gears, lottery die, progress bar), warning flashes and chain conflict markers
- Light / dark mode, honours `prefers-reduced-motion`

### Scene Configuration
- Declarative scene definitions with TypeScript interfaces (`app/config/scenes.ts`)
- Pre-configured scenes: default (5 nodes) and simple (3 nodes)

## Project Structure

```
simledger/
├── app/                              # Nuxt application (Vue 3)
│   ├── app.vue                       # Root component: provides the network store, loads the scene
│   ├── components/
│   │   ├── Dashboard.vue             # Split pane layout
│   │   ├── NodeExplorer.vue          # Chain, conflicts, pending pool and ledger of the selected node
│   │   ├── NodeEditor.vue            # Transaction form, mining and chain validation
│   │   ├── LogConsole.vue            # Log messages of all nodes
│   │   ├── PaneHeader.vue            # Pane title bar
│   │   ├── InfoPopup.vue             # About dialog (version, links)
│   │   ├── ledger/                   # NodeDot, AddressLabel, TransactionItem
│   │   └── graph/                    # Vue Flow network graph
│   │       ├── GraphViewer.vue       # Canvas, toolbar, controls, minimap
│   │       ├── NetworkNode.vue       # Node card (balance, mining state, conflict icon, menu)
│   │       ├── NetworkEdge.vue       # Floating edge, conflict style, broadcast packets
│   │       ├── BroadcastPacket.vue   # Packet animated along an edge
│   │       ├── ConnectionMenu.vue    # Connect / disconnect peers
│   │       └── GraphToolbar.vue      # Add node, layout, fit view, pause
│   ├── composables/
│   │   ├── useNetwork.ts             # Network store (nodes, edges, selection, conflicts, actions)
│   │   ├── useBroadcastAnimations.ts # Packets travelling along edges
│   │   ├── useSceneSetup.ts          # Scene initialization
│   │   └── useAssetUrl.ts            # Public asset URLs under the deployment base path
│   ├── config/scenes.ts              # Scene presets
│   ├── plugins/version.ts            # App version from package.json
│   └── utils/                        # Framework-free helpers (address labels, graph layout / motion)
├── src/                              # Framework-free domain
│   ├── blockchain/
│   │   ├── blockchain.ts             # Chain, pending pool, validation, chain replacement
│   │   ├── block.ts                  # Block hashing, mining, transaction validation
│   │   ├── transaction.ts            # Signed transfers
│   │   ├── account-state.ts          # Balances and per-block state snapshots
│   │   └── types.ts                  # Shared type definitions
│   ├── network/
│   │   ├── system.ts                 # Simulation clock (ticks)
│   │   ├── system_node.ts            # Network node: peers, gossip, mining, longest-chain rule, conflicts
│   │   └── tick.ts                   # Tick event
│   └── common.ts                     # Crypto and encoding helpers
├── public/js/mining.js               # Proof-of-work Web Worker
├── test/                             # Unit, component and end-to-end tests
├── assets/                           # Global CSS
└── nuxt.config.ts                    # Nuxt configuration
```

## Technology Stack

- **Frontend**: Vue 3, Nuxt 4, TypeScript, [Nuxt UI](https://ui.nuxt.com) 4, Splitpanes
- **Visualization**: [Vue Flow](https://vueflow.dev) (Vue port of the React Flow / xyflow model), requestAnimationFrame-driven packet animations
- **Blockchain**: SHA256 (`crypto-js`), secp256k1 ECDSA (`elliptic`), Base58 (`bs58`)
- **Events**: RxJS subjects for ticks, broadcasts and node events
- **Testing**: Vitest, `@nuxt/test-utils`, Vue Test Utils, happy-dom, Playwright

## Getting Started

Requires Node.js 20 or newer (the test workflow uses 22, the deployment 20).

```bash
npm install        # install dependencies (runs `nuxt prepare`)
npm run dev        # development server on http://localhost:3000
npm run build      # production build
npm run preview    # preview the production build
npm run generate   # static site in .output/public
```

pnpm, yarn and bun work as well (`pnpm dev`, `yarn dev`, `bun run dev`, ...).

## Deployment

The application is deployed through Cloudflare as a static site; the deployment is configured in Cloudflare,
not in this repository. Build it with `npm run generate` and serve `.output/public`.

The site is built for the root path by default. To serve it under a sub path, set `NUXT_APP_BASE_URL`
(e.g. `/simledger/`) at build time; all assets are resolved against it.

## Testing

| Command | What it runs |
| --- | --- |
| `npm test` | All Vitest projects (unit + component) |
| `npm run test:unit` | Framework-free tests in Node: graph helpers, stores, blockchain / network domain |
| `npm run test:nuxt` | Component and composable tests in the Nuxt runtime (happy-dom, `@nuxt/test-utils`) |
| `npm run test:coverage` | All Vitest projects with V8 coverage and thresholds |
| `npm run test:e2e` | Playwright end-to-end tests against the generated site served under the sub path `/simledger/` |
| `npm run typecheck` | `vue-tsc` over the app and the tests |

Tests live in `test/`:

- `test/unit/` – spring layout, broadcast routing, motion / easing, floating edges, network and animation stores,
  scene setup, transactions, blockchain mining and chain replacement (the real `public/js/mining.js` runs in a
  fake Worker), `SystemNode` broadcasting, the longest-chain rule and chain conflicts
- `test/nuxt/` – components mounted with `mountSuspended`: node card, connection menu, edge and packet animation
  (mocked `requestAnimationFrame` and path sampling), graph viewer, toolbar, explorer (incl. conflict panel),
  editor, console, dashboard
- `test/e2e/` – the running app: default scene, selection sync, connecting / disconnecting (menu, handle drag,
  Backspace), dragging, toolbar, color mode, packets travelling and being relayed, packets following a dragged
  node, mining, rejected transactions, reduced motion, and a split network resolving its fork with
  retain / adopt

The E2E suite builds the site itself (`npm run e2e:build`) unless a server is already running on port 4173.
Install the browser once with `npx playwright install chromium`, or point `PLAYWRIGHT_CHROMIUM_EXECUTABLE` at an
existing Chromium.

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

### Blockchain
Based on Xavier Decuyper's architecture:
- **Blockchain**: the chain of blocks, the pending transaction pool, validation and chain replacement
- **Block**: transactions, timestamp, nonce, hash and the miner's reward address
- **Transaction**: a signed value transfer; `_` as sender marks a mining reward
- **AccountStateManager**: balances of all addresses, with a snapshot per block

The reward for a block is paid in the *next* block: every block must contain one reward transaction to the
miner of the previous block.

### Network
- `System` emits a tick every 2000 ms; nodes process their queued broadcasts on the next tick
- Each `SystemNode` owns a blockchain and a key pair, and subscribes to the broadcasts of its peers
- Nodes apply the longest-chain rule and report chain conflicts they cannot decide (see
  [Forks and Chain Conflicts](#forks-and-chain-conflicts))

### UI State
- The network store (`useNetwork`) is the single source of truth; Vue Flow nodes and edges are derived from it
- Domain objects stay non-reactive; a `version` counter bumped on every tick, node event and action makes
  views re-evaluate

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – layers, data flow, consensus and fork handling
- [API_REFERENCE.md](API_REFERENCE.md) – classes, store and helpers
- [CHANGELOG.md](CHANGELOG.md) – release notes

## Contributing

This is an educational project designed to demonstrate blockchain concepts and network visualization.
Run `npm run typecheck`, `npm test` and `npm run test:e2e` before opening a pull request.

## License

MIT
