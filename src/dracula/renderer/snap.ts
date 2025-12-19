/**
 * Graph Dracula is a set of tools to display and layout interactive graphs, along with various related algorithms.
 Based on JavaScript and SVG.
 The code is released under the MIT license, so commercial use is not a problem.
 https://github.com/strathausen/dracula
 */
/* eslint-disable */
import SnapSvg from 'snapsvg'
import Renderer from './renderer'

export default class RaphaelRenderer extends Renderer {
  canvas: any
  lineStyle: { stroke: string; 'stroke-width': string }
  
  /**
   * SnapSVG Renderer - Lightweight SVG graph rendering using Snap.svg
   * 
   * Alternative to Raphael renderer using the Snap.svg library.
   * Renders Dracula graph nodes and edges as native SVG elements with minimal abstraction.
   * 
   * Features:
   * - Simple circle nodes (10px radius) with position-based rendering
   * - Direct line connections between nodes (no curve routing)
   * - Lightweight codebase suitable for smaller graphs
   * - Line styling: #abcdef strokes with 2px width
   * 
   * Note: Currently lacks interactive drag support that RaphaelRenderer provides.
   * Best used for static graph visualization or as a base for custom implementations.
   * 
   * @extends Renderer
   * @param {HTMLElement|string} element - DOM element or selector for canvas container
   * @param {Dracula} graph - Graph data structure to render
   * @param {number} width - Canvas width in pixels
   * @param {number} height - Canvas height in pixels
   */
  constructor(element, graph, width, height) {
    super(element, graph, width, height)
    this.canvas = SnapSvg(element)
    this.lineStyle = {
      stroke: '#abcdef',
      'stroke-width': '2px',
    }
  }

  drawNode(node) {
    /**
     * Renders a graph node as an SVG circle using Snap.svg
     * 
     * Creates a simple circle shape at node's computed position.
     * Circle radius is fixed at 10 pixels.
     * No interactive features (drag, color, or styling) applied.
     * 
     * @param {DraculaNode} node - Node to render with point[x,y] coordinates
     * @returns {void}
     */
    // TODO update / cache shape
    node.shape = this.canvas.circle(node.point[0], node.point[1], 10)
  }

  drawEdge(edge) {
    /**
     * Renders a connection line between two nodes using Snap.svg
     * 
     * Creates a straight line from source node center to target node center.
     * Applies lineStyle attribute (#abcdef stroke, 2px width).
     * Does not auto-update when nodes move (use RaphaelRenderer for dynamic updates).
     * 
     * @param {DraculaEdge} edge - Edge with source/target nodes to connect
     * @returns {void}
     */
    const p1 = edge.source.point
    const p2 = edge.target.point
    edge.shape = this.canvas.line(p1[0], p1[1], p2[0], p2[1])
    edge.shape.attr(this.lineStyle)
  }
}
