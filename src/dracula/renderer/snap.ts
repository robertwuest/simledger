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
  constructor(element, graph, width, height) {
    super(element, graph, width, height)
    this.canvas = SnapSvg(element)
    this.lineStyle = {
      stroke: '#abcdef',
      'stroke-width': '2px',
    }
  }

  drawNode(node) {
    // TODO update / cache shape
    node.shape = this.canvas.circle(node.point[0], node.point[1], 10)
  }

  drawEdge(edge) {
    const p1 = edge.source.point
    const p2 = edge.target.point
    edge.shape = this.canvas.line(p1[0], p1[1], p2[0], p2[1])
    edge.shape.attr(this.lineStyle)
  }
}
