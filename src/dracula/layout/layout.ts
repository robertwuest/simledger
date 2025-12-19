import forEach from 'lodash/forEach.js';
import type Dracula from '../dracula';
import NodeData from '../dracula';

/**
 * Base Layout Class for Graph Visualization
 * 
 * Provides the foundation for all graph layout algorithms.
 * Layout algorithms compute positions (x, y coordinates) for each node in the graph.
 * 
 * Different layout algorithms produce different visual organization:
 * - Spring: Force-directed, natural equilibrium
 * - OrderedTree: Hierarchical tree structure
 * - TournamentTree: Tournament bracket layout
 * 
 * @abstract
 * @class Layout
 */
export default class Layout {
  graph: Dracula;

  /**
   * Constructs a Layout instance
   * 
   * @param {Dracula} graph - The graph to layout
   */
  constructor(graph: Dracula) {
    this.graph = graph;
  }

  layout(): void {
    this.initCoords();
    this.layoutPrepare();
    this.layoutCalcBounds();
  }

  /**
   * Initialize all node layout coordinates to (0, 0)
   * 
   * Called at the beginning of layout to reset positions.
   */
  initCoords(): void {
    forEach(this.graph.nodes, (node: NodeData) => {
      node.layoutPosX = 0;
      node.layoutPosY = 0;
    });
  }

  /**
   * Prepare layout by implementing algorithm-specific initialization
   * 
   * To be implemented by subclasses.
   * This is where the actual layout algorithm runs.
   * 
   * @abstract
   * @throws {Error} If not implemented by subclass
   */
  layoutPrepare(): void {
    throw new Error('not implemented');
  }

  /**
   * Calculate and store the bounding box of the laid-out graph
   * 
   * Called at the end of layout to compute the overall bounds.
   * Updates the graph's layout min/max properties for use by renderers.
   * Adds 50% padding to maximum coordinates for visual margin.
   */
  layoutCalcBounds(): void {
    let minx = Infinity;
    let maxx = -Infinity;
    let miny = Infinity;
    let maxy = -Infinity;
    forEach(this.graph.nodes, (node: NodeData) => {
      const x = node.layoutPosX ?? 0;
      const y = node.layoutPosY ?? 0;
      if (x > maxx) maxx = x;
      if (x < minx) minx = x;
      if (y > maxy) maxy = y;
      if (y < miny) miny = y;
    });
    this.graph.layoutMinX = minx;
    this.graph.layoutMaxX = maxx * 1.5;
    this.graph.layoutMinY = miny;
    this.graph.layoutMaxY = maxy * 1.5;
  }
}
