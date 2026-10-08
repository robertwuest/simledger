# Changelog

All notable changes to SimLedger. Versions follow [Semantic Versioning](https://semver.org); pre-release
versions may change behaviour between releases.

## 0.1.1-alpha.1

### Added
- **Chain conflicts**: nodes detect connected peers whose chain diverges from their own (a fork) and report
  it once in the console. The graph marks the edge (amber, dashed) and the node cards (fork icon, dashed
  border); the explorer shows a *Chain conflict with …* panel and a **Fork** badge on the affected blocks.
- **Retain own chain / Adopt peer's chain** buttons in the explorer to resolve a conflict per node. Retaining
  holds until one of the chains changes; adopting validates the peer's chain, switches to it, returns the
  transfers of the discarded blocks to the pending pool and broadcasts the new latest block.
- **Console feedback for the longest-chain rule**: nodes log when they synchronize missing blocks, adopt a
  longer chain (with fork block, discarded blocks and re-queued transactions) or reject an invalid longer
  chain.
- `SystemNode.getChainConflicts()`, `retainChain()`, `adoptChain()` and the events `CHAIN_CONFLICT`,
  `CHAIN_ADOPTED`, `CHAIN_RETAINED`.
- `Blockchain.getForkIndex()`, `replaceChain()` and `restorePendingTransactions()`.
- Network store: `getChainConflicts()`, `conflictEdgeIds`, `adoptChain()`, `retainChain()`; `NodeView` gained
  `chainLength` and `openConflicts`.
- Unit, component and end-to-end tests for forks, the longest-chain rule and conflict resolution.
- This changelog.

### Changed
- Switching to a longer chain validates the complete chain first and leaves the own chain untouched if it is
  invalid (previously the chain was truncated block by block and could end up half replaced).
- After a block arrives or a chain switch, the pending pool is rebuilt without confirmed, duplicated or no
  longer valid transactions, instead of concatenating the pools of both nodes.
- Transactions that arrive while mining stay in the pending pool for the next block.

### Fixed
- A node whose mined block no longer fits its chain (a peer's block arrived first) stays in the mining state
  forever; it now stops mining and logs a warning.
- Transactions arriving while mining were added to the block being mined, which invalidated its hash.

### Documentation
- README with a user guide, a section on forks and chain conflicts, and the current project structure.
- ARCHITECTURE with consensus rules, the fork handling flow and updated performance figures.
- API_REFERENCE rewritten to match the code (instance methods, return values, `AccountStateManager`, network
  store, helpers, console messages).

## 0.1.0-alpha.1

First tagged pre-release of the Nuxt 4 version.

- Blockchain with proof of work (Web Worker), secp256k1 signatures and an `AccountStateManager` for O(1)
  balance lookups
- Tick-based multi-node network simulation with transaction and block gossip
- Vue Flow network graph with spring layout, animated broadcast packets, connection menu, toolbar and minimap
- Explorer, editor and console panes built with Nuxt UI, light and dark mode
- Declarative scene configuration
- Unit, component and end-to-end tests, GitHub Pages deployment
