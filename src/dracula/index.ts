/**
 * Graph Dracula - Interactive Graph Visualization Library
 * 
 * Complete API for building, laying out, and rendering interactive network graphs.
 * Includes three primary subsystems:
 * 
 * 1. Graph - Core data structure for nodes and edges
 * 2. Layout - Algorithms for positioning nodes (Spring, OrderedTree, TournamentTree)
 * 3. Renderer - SVG rendering engines (Raphael, Snap.svg)
 * 
 * The Dracula library is released under the MIT license.
 * Based on JavaScript and SVG.
 * https://github.com/strathausen/dracula
 */
/* eslint-disable */

// Core
import dracula from './dracula';

// Layouts
import spring from './layout/spring';
import orderedTree from './layout/ordered_tree';
import tournamentTree from './layout/tournament_tree';

// Renderers
import raphael from './renderer/raphael';

/**
 * Dracula Graph - Main graph data structure
 * 
 * Create nodes and edges, retrieve neighbors, manage graph topology.
 * 
 * @example
 * const graph = new Graph();
 * graph.addNode('Alice');
 * graph.addNode('Bob');
 * graph.addEdge('Alice', 'Bob', { style: 'solid' });
 */
export const Graph = dracula;

/**
 * Layout Algorithms for positioning nodes on canvas
 * 
 * @property {OrderedTree} OrderedTree - Hierarchical binary tree layout
 * @property {Spring} Spring - Force-directed physics-based layout
 * @property {TournamentTree} TournamentTree - Tournament bracket binary tree layout
 * 
 * @example
 * const layout = new Layout.Spring(graph);
 * // Nodes now have layoutPosX, layoutPosY coordinates
 */
export const Layout = {
  OrderedTree: orderedTree,
  Spring: spring,
  TournamentTree: tournamentTree,
};

/**
 * SVG Renderer implementations for visualization
 * 
 * @property {RaphaelRenderer} Raphael - Feature-rich renderer with dragging and animations
 * 
 * @example
 * const renderer = new Renderer.Raphael('#canvas', graph, 800, 600);
 * renderer.draw();
 */
export const Renderer = {
  Raphael: raphael,
};
