/**
 * Graph Dracula is a set of tools to display and layout interactive graphs, along with various related algorithms.
 Based on JavaScript and SVG.
 The code is released under the MIT license, so commercial use is not a problem.
 https://github.com/strathausen/dracula
 */
/* eslint-disable */
import Layout from './layout.js'

/**
 * OrderedTree Layout Algorithm
 * 
 * A hierarchical tree layout that assumes a perfect binary tree structure.
 * Positions nodes at fixed Y-coordinates based on tree depth, creating a clear hierarchical visualization.
 * 
 * The algorithm:
 * 1. Calculates total tree depth using logarithms
 * 2. Assigns each node a rank (depth from top) and file (position within depth level)
 * 3. Uses 2^rank-1 node count to identify depth
 * 4. Places nodes at fixed Y coordinates based on their relative position within depth
 * 
 * Best for: Perfect binary trees, organizational hierarchies, decision trees
 * 
 * @class OrderedTree
 * @extends Layout
 */
export default class OrderedTree extends Layout {
  /**
   * Order array tracking the tree structure
   * @type {any}
   */
  order: any

  /**
   * Creates an OrderedTree layout and immediately computes node positions
   * 
   * @param {Dracula} graph - The graph to layout
   * @param {any} order - Array describing the tree structure/order
   */
  constructor(graph, order) {
    super(graph)
    this.order = order
    this.layout()
  }

  layoutPrepare() {
    /**
     * Prepares the layout by assigning positions based on perfect binary tree structure
     * 
     * Algorithm:
     * 1. Calculates tree depth: log2(numNodes) gives max depth needed
     * 2. For each node at index i:
     *    - Rank = log2(i+1) = depth in tree
     *    - File = (i+1) - 2^rank = position within depth level
     * 3. X coordinate = (totalDepth - rank) = levels remaining
     * 4. Y coordinate = file = position within row
     * 
     * This creates a balanced tree layout with proper hierarchical structure.
     */
    // To reverse the order of rendering, we need to find out the
    // absolute number of levels we have. simple log math applies.
    const numNodes = this.order.length
    const totalLevels = Math.floor(Math.log(numNodes) / Math.log(2))

    let counter = 1
    this.order.forEach((node) => {
      // Rank aka x coordinate
      const rank = Math.floor(Math.log(counter) / Math.log(2))
      // File relative to top
      const file = counter - Math.pow(rank, 2)

      node.layoutPosX = totalLevels - rank
      node.layoutPosY = file
      counter++;
    })
  }
}
