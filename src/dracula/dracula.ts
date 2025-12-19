/**
 * Graph Dracula - Interactive Graph Visualization and Layout
 * 
 * A comprehensive library for displaying and laying out interactive graphs using JavaScript and SVG.
 * Provides graph data structures, multiple layout algorithms, and renderers for visualization.
 * 
 * Based on the original Dracula library.
 * Released under the MIT license.
 * https://github.com/strathausen/dracula
 * 
 * @module Dracula
 */
/* eslint-disable */
import { v4 as uuid } from 'uuid';

// Testing for string or number data type
const isId = (x: any): x is string | number => !!~['string', 'number'].indexOf(typeof x);

/**
 * Represents a node in the graph
 * 
 * @interface DraculaNode
 * @property {string|number} id - Unique identifier for the node
 * @property {any} shape - Shape object from renderer (set by renderer, not user)
 * @property {DraculaEdge[]} edges - Array of edges connected to this node
 * @property {any} [key: string] - Additional custom properties
 */
export interface DraculaNode {
  id: string | number;
  shape: any;
  edges: DraculaEdge[];
  [key: string]: any;
}

/**
 * Represents an edge (connection) between two nodes
 * 
 * @interface DraculaEdge
 * @property {any} style - Style configuration (colors, width, directed, etc.)
 * @property {DraculaNode} source - The source node
 * @property {DraculaNode} target - The target node
 * @property {any} [key: string] - Additional custom properties
 */
export interface DraculaEdge {
  style: any;
  source: DraculaNode;
  target: DraculaNode;
  [key: string]: any;
}

/**
 * Main graph data structure for Dracula
 * 
 * Manages nodes and edges. Layout algorithms and renderers operate on this structure.
 * The graph is directed (edges have a source and target direction).
 * 
 * @class Dracula
 * @property {Object<string|number, DraculaNode>} nodes - Map of nodes indexed by ID
 * @property {DraculaEdge[]} edges - Array of edges in the graph
 * @property {number} layoutMinX - Minimum X coordinate from layout algorithm
 * @property {number} layoutMinY - Minimum Y coordinate from layout algorithm
 * @property {number} layoutMaxX - Maximum X coordinate from layout algorithm
 * @property {number} layoutMaxY - Maximum Y coordinate from layout algorithm
 */
export default class Dracula {
  nodes: { [key: string]: DraculaNode; [key: number]: DraculaNode };
  edges: DraculaEdge[];
  layoutMinX: number;
  layoutMinY: number;
  layoutMaxX: number;
  layoutMaxY: number;

  /**
   * Creates a new empty graph
   */
  constructor() {
    this.nodes = {};
    this.edges = [];
    this.layoutMinX = 0;
    this.layoutMinY = 0;
    this.layoutMaxX = 0;
    this.layoutMaxY = 0;
  }

  /**
   * Factory method to create a new graph instance
   * 
   * Provides a functional alternative to `new Dracula()` for users who prefer factory patterns.
   *
   * @static
   * @returns {Dracula} A new empty graph instance
   * 
   * @example
   * const graph = Dracula.create();
   */
  static create() {
    return new Dracula()
  }

  /**
   * Adds a node to the graph
   * 
   * If a node with the same ID already exists, returns the existing node without modification.
   * Automatically generates a UUID if no ID is provided.
   * 
   * This method does NOT update existing nodes - if you want to update a node, modify it directly:
   * ```typescript
   * const node = graph.addNode('node1', { label: 'Initial' });
   * node.label = 'Updated'; // Direct property update
   * ```
   *
   * @param {string|number|object} id - Node identifier or node data object
   * @param {object} [nodeData] - Optional node properties (label, color, etc.)
   * @returns {DraculaNode} The new or existing node with the given ID
   * 
   * @example
   * // Add node with ID
   * const node1 = graph.addNode('alice', { label: 'Alice' });
   * 
   * // Add node with auto-generated ID
   * const node2 = graph.addNode({ label: 'Bob' });
   * 
   * // Get existing node (doesn't create duplicate)
   * const sameNode = graph.addNode('alice');
   */
  addNode(id: any, nodeData?: any): DraculaNode {
    // Node initialisation shorthands
    if (!nodeData) {
      nodeData = isId(id) ? { id } : id
    } else {
      nodeData.id = id
    }
    if (!nodeData.id) {
      console.log('New ID for ' + id);
      nodeData.id = uuid()
      // Don't create a new node if it already exists
    } else if (this.nodes[nodeData.id]) {
      const existingNode = this.nodes[nodeData.id];
      if (!existingNode) {
        throw new Error(`Node with id ${nodeData.id} not found`);
      }
      return existingNode;
    }
    nodeData.edges = []
    this.nodes[nodeData.id] = nodeData
    return nodeData
  }

  /**
   * Adds a directed edge between two nodes
   * 
   * If either node doesn't exist, it will be created automatically.
   * The edge is directed from source to target.
   * 
   * The same pair of nodes can have multiple edges (each with different properties/styles).
   *
   * @param {string|number|object} sourceNode - Source node or node ID
   * @param {string|number|object} targetNode - Target node or node ID
   * @param {object} [opts] - Optional edge properties (style, color, width, label, callback, etc.)
   * @returns {DraculaEdge} The created edge
   * 
   * @example
   * const graph = Dracula.create();
   * const alice = graph.addNode('alice');
   * const bob = graph.addNode('bob');
   * 
   * // Add edge with default style
   * const edge = graph.addEdge('alice', 'bob');
   * 
   * // Add edge with custom style
   * graph.addEdge('alice', 'bob', {
   *   style: { stroke: 'red', strokeWidth: 2, directed: true }
   * });
   */
  addEdge(sourceNode: string | number | object, targetNode: string | number | object, opts: any = {}) {
    const source = this.addNode(sourceNode)
    const target = this.addNode(targetNode)
    const style = opts.style || opts
    const edge = { style, source, target }
    this.edges.push(edge)
    source.edges.push(edge)
    target.edges.push(edge)
    return edge
  }

  /**
   * @param {string|number|Node} node node or ID
   * @return {Node}
   */
  removeNode(node: DraculaNode | string | number) {
    const id = isId(node) ? node : node.id;
    let nodeToRemove = this.nodes[id];
    // Delete node from index
    delete this.nodes[id];
    // Delete node from all the edges
    this.edges.forEach((edge) => {
      if (edge.source === nodeToRemove || edge.target === nodeToRemove) {
        this.removeEdge(edge, null);
      }
    });
    nodeToRemove?.shape.items.forEach((item: any) => {
      item.node.remove();
    });
    return nodeToRemove;
  }

  /**
   * Remove an edge by providing either two nodes (or ids) or the edge instance
   * @param {string|number|Node|Edge} node edge, node or ID
   * @param {string|number|Node} node node or ID
   * @return {Edge}
   */
  removeEdge(source, target) {
    let found;
    // Fallback to only one parameter
    if (!target) {
      target = source.target;
      source = source.source;
    }
    // Normalise node IDs
    if (isId(source)) source = { id: source };
    if (isId(target)) target = { id: target };
    // Find and remove edge
    this.edges = this.edges.filter((edge) => {
      if (edge.source.id === source.id && edge.target.id === target.id) {
        found = edge;
        return false;
      }
      return true;
    });
    if (found) {
      found.source.edges = found.source.edges.filter(edge => edge !== found);
      found.target.edges = found.target.edges.filter(edge => edge !== found);
      found.shape.fg.node.remove();
    }
    // Return removed edge
    return found;
  }

  toJSON() {
    return { nodes: this.nodes, edges: this.edges }
  }
}
