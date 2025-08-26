import forEach from 'lodash/forEach.js';
import type Dracula from '../dracula';
import NodeData from '../dracula';

export default class Layout {
  graph: Dracula;
  constructor(graph: Dracula) {
    this.graph = graph;
  }

  layout(): void {
    this.initCoords();
    this.layoutPrepare();
    this.layoutCalcBounds();
  }

  initCoords(): void {
    forEach(this.graph.nodes, (node: NodeData) => {
      node.layoutPosX = 0;
      node.layoutPosY = 0;
    });
  }

  layoutPrepare(): void {
    throw new Error('not implemented');
  }

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
