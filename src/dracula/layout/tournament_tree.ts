/**
 * Graph Dracula is a set of tools to display and layout interactive graphs, along with various related algorithms.
 Based on JavaScript and SVG.
 The code is released under the MIT license, so commercial use is not a problem.
 https://github.com/strathausen/dracula
 */
/* eslint-disable */
import forEach from 'lodash/forEach.js';
import Layout from './layout.js'

export default class TournamentTree extends Layout {
  order: any[];
  
  /**
   * TournamentTree Layout - Binary tree layout for tournament/binary search trees
   * 
   * Arranges nodes in a perfect binary tree structure with nodes at specific levels.
   * Uses the provided order array to determine final positions.
   * 
   * Algorithm:
   * - Calculates total depth as log2(numNodes)
   * - Assigns each node a depth level based on its index position
   * - Positions nodes left-to-right at each level with exponential spacing
   * - Similar to OrderedTree but uses provided ordering instead of graph structure
   * 
   * Best for: Tournament bracket visualization, binary search trees, sorted hierarchies
   * 
   * @extends Layout
   * @param {Dracula} graph - Graph data structure
   * @param {any[]} order - Array of nodes in tournament order
   */
  constructor(graph: any, order: any[]) {
    super(graph)
    this.graph = graph
    this.order = order
    this.layout()
  }

  override layout() {
    /**
     * Executes tournament tree layout pipeline
     * 
     * @returns {void}
     */
    this.layoutPrepare()
    this.layoutCalcBounds()
  }

  override layoutPrepare() {
    /**
     * Positions nodes in tournament/binary tree structure
     * 
     * Algorithm:
     * 1. Initialize all nodes to position (0, 0)
     * 2. Calculate tree depth: floor(log2(numNodes))
     * 3. For each node in order array:
     *    - Determine its depth from the number of items seen so far: floor(log2(counter))
     *    - Calculate horizontal offset based on depth relative to root level
     *    - Set X position with exponential spacing: offset + (counter - 2^depth) * 2^(depth_offset + 1)
     *    - Set Y position to depth level
     * 
     * Result: Perfect binary tree layout ready for rendering with consistent level-based spacing
     * 
     * @returns {void}
     */
    forEach(this.graph.nodes, (node) => {
      node.layoutPosX = 0
      node.layoutPosY = 0
    })

    // To reverse the order of rendering, we need to find out the
    // absolute number of levels we have. simple log math applies.
    const numNodes = this.order.length
    const totalLevels = Math.floor(Math.log(numNodes) / Math.log(2))

    let counter = 1
    this.order.forEach((node) => {
      const depth = Math.floor(Math.log(counter) / Math.log(2))
      const offset = Math.pow(2, totalLevels - depth)
      const finalX = offset + (counter - Math.pow(2, depth)) *
        Math.pow(2, (totalLevels - depth) + 1)
      node.layoutPosX = finalX
      node.layoutPosY = depth
      counter++;
    })
  }
}
