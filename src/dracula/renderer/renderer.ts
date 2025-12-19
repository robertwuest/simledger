/**
 * Graph Dracula - Interactive Graph Visualization and Layout
 * 
 * A comprehensive library for displaying and laying out interactive graphs using JavaScript and SVG.
 * Provides graph data structures, multiple layout algorithms, and renderers for visualization.
 * 
 * https://github.com/strathausen/dracula
 */
/* eslint-disable */
import forEach from 'lodash/forEach';
import type Dracula from '../dracula';

/**
 * Base Renderer Class for Graph Visualization
 * 
 * Provides the foundation for all graph rendering implementations.
 * Handles coordinate transformation from graph space to canvas space.
 * 
 * Subclasses implement:
 * - drawNode(node): Render individual nodes
 * - drawEdge(edge): Render individual edges
 * 
 * @abstract
 * @class Renderer
 */
export default class Renderer {
  graph: Dracula;
  element: HTMLElement;
  width: number;
  height: number;
  radius: number;
  factorX: number;
  factorY: number;
  
  /**
   * Creates a new Renderer instance
   * 
   * @param {HTMLElement|string} element - Target DOM element or CSS selector
   * @param {Dracula} graph - The graph to render
   * @param {number} [width=400] - Canvas width in pixels
   * @param {number} [height=300] - Canvas height in pixels
   */
  constructor(element: HTMLElement | string, graph: Dracula, width: number, height: number) {
    this.graph = graph
    // Convert a query into a dom element
    if (typeof element === 'string') {
      element = document.querySelector(element) as HTMLElement;
    }
    this.element = element
    this.width = width || 400
    this.height = height || 300
    this.radius = 40
    this.factorX = 0
    this.factorY = 0
  }

  /**
   * Performs the rendering by drawing all nodes and edges
   * 
   * Calculates scale factors to fit the graph into the canvas with padding.
   * Transforms each node's layout position to canvas coordinates.
   * Then renders all nodes and edges.
   */
  draw() {
    this.factorX = (this.width - 2 * this.radius) /
      (this.graph.layoutMaxX - this.graph.layoutMinX)

    this.factorY = (this.height - 2 * this.radius) /
      (this.graph.layoutMaxY - this.graph.layoutMinY)

    forEach(this.graph.nodes, (node) => {
      node.point = this.translate([node.layoutPosX, node.layoutPosY])
      this.drawNode(node)
    })
    forEach(this.graph.edges, (edge) => {
      this.drawEdge(edge)
    })
  }

  /**
   * Transforms graph space coordinates to canvas space coordinates
   * Applies scale factors and offset to fit graph onto canvas with padding
   * 
   * @param {number[]} point - [x, y] coordinates in graph space
   * @returns {number[]} [x, y] coordinates in canvas space
   */
  translate(point: number[]) {
    return [
      Math.round((point[0] - this.graph.layoutMinX) * this.factorX + this.radius),
      Math.round((point[1] - this.graph.layoutMinY) * this.factorY + this.radius),
    ]
  }

  /**
   * Renders a node - to be implemented by subclasses
   * 
   * @abstract
   * @param {DraculaNode} node - The node to render
   * @throws {Error} If not implemented by subclass
   */
  drawNode(node: any) { // eslint-disable-line no-unused-vars, class-methods-use-this
    throw new Error('not implemented')
  }

  /**
   * Renders an edge - to be implemented by subclasses
   * 
   * @abstract
   * @param {DraculaEdge} edge - The edge to render
   * @throws {Error} If not implemented by subclass
   */
  drawEdge(edge: any) { // eslint-disable-line no-unused-vars, class-methods-use-this
    throw new Error('not implemented')
  }

  /**
   * Factory method to create a new Renderer instance
   * 
   * @static
   * @param {...any} args - Constructor arguments
   * @returns {Renderer} A new Renderer instance
   */
  static render(...a: ConstructorParameters<typeof Renderer>) {
    return new Renderer(...a)
  }
}
