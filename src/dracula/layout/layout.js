/**
 * Graph Dracula is a set of tools to display and layout interactive graphs, along with various related algorithms.
 Based on JavaScript and SVG.
 The code is released under the MIT license, so commercial use is not a problem.
 https://github.com/strathausen/dracula
 */
/* eslint-disable */
import forEach from 'lodash/forEach.js';

/**
 * Base class for distributing nodes algorithms
 */
export default class Layout {
  constructor(graph) {
    this.graph = graph
  }

  layout() {
    this.initCoords()
    this.layoutPrepare()
    this.layoutCalcBounds()
  }

  initCoords() {
    forEach(this.graph.nodes, (node) => {
      node.layoutPosX = 0
      node.layoutPosY = 0
    })
  }

  layoutPrepare() { // eslint-disable-line
    throw new Error('not implemented')
  }

  layoutCalcBounds() {
    let minx = Infinity
    let maxx = -Infinity
    let miny = Infinity
    let maxy = -Infinity
    forEach(this.graph.nodes, (node) => {
      const x = node.layoutPosX
      const y = node.layoutPosY

      if (x > maxx) maxx = x
      if (x < minx) minx = x
      if (y > maxy) maxy = y
      if (y < miny) miny = y
    })
    this.graph.layoutMinX = minx
    this.graph.layoutMaxX = maxx * 1.5
    this.graph.layoutMinY = miny
    this.graph.layoutMaxY = maxy * 1.5
  }
}
