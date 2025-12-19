/**
 * Graph Dracula is a set of tools to display and layout interactive graphs, along with various related algorithms.
 Based on JavaScript and SVG.
 The code is released under the MIT license, so commercial use is not a problem.
 https://github.com/strathausen/dracula
 */
/* eslint-disable */
import ImportedRaphael from 'raphael';
import Renderer from './renderer';
import type Dracula from '../dracula';
import type { DraculaEdge, DraculaNode } from '../dracula';

// Is not bundled for the standalone browser version (e.g. for CDN)
const Raphael = typeof window !== 'undefined' && window.Raphael || ImportedRaphael

/**
 * Makes Raphael shapes draggable with event handling
 * 
 * Enables interactive dragging for each SVG shape in the set.
 * Provides three-phase drag lifecycle:
 * 1. DragMove: Item follows cursor while left-mouse held; triggers shapeDragMove event
 * 2. DragEnter: Mouse enters shape during drag; animates fill-opacity from 0 to 0.2
 * 3. DragOut: Mouse leaves shape during drag; animates fill-opacity back to 0
 * 
 * Maintains shape offset (ox, oy) and connected edges array.
 * Re-draws all connected edges in real-time as shape moves.
 * Only responds to left-mouse (e.which === 1) to exclude middle-click pan interactions.
 * 
 * Fires shapeDragMove CustomEvent with detail: { item, x, y, pageX, pageY } for Vue components.
 * 
 * @param {object} shape - Raphael shape set with items[], paper, connections[]
 * @returns {void}
 */
const dragify = (shape: { paper: any; items: any[]; connections: any[]; }) => {
  const r = shape.paper;
  shape.items.forEach((item: { set: { ox: number; oy: number; translate: (arg0: number, arg1: number) => void; }; type: string; node: { style: { cursor: string; }; getBoundingClientRect: () => any; parentElement: { getBoundingClientRect: () => any; }; }; drag: (arg0: (dx: number, dy: number, x: number, y: number, e: MouseEvent) => void, arg1: (x: number, y: number, e: MouseEvent) => void, arg2: (e: MouseEvent) => void) => void; animate: (arg0: { "fill-opacity": number; }, arg1: number) => void; }) => {
    item.set = shape;
    if (item.type === 'text') {
      return
    }
    item.node.style.cursor = 'move';
    item.drag(
      // DragMove
      (dx: number, dy: number, x: number, y: number, e: MouseEvent) => {
        if (e.which === 1) {
          dx = item.set.ox;
          dy = item.set.oy;
          item.set.translate(x - Math.round(dx), y - Math.round(dy));
          shape.connections.forEach((connection: { draw: () => void; }) => {
            connection.draw();
          });
          item.set.ox = x;
          item.set.oy = y;
          const shapeBounds = item.node.getBoundingClientRect();
          const parentBounds = item.node.parentElement.getBoundingClientRect();

          const event = new CustomEvent('shapeDragMove', { detail: {
              item,
              x: shapeBounds.x - parentBounds.x,
              y: shapeBounds.y - parentBounds.y,
              pageX: e.pageX,
              pageY: e.pageY,
            }
          });
          window.dispatchEvent(event);
        }
      },
      // DragEnter
       (x: number, y: number, e: MouseEvent) => {
        if (e.which === 1) {
          item.set.ox = x;
          item.set.oy = y;
          item.animate({ 'fill-opacity': 0.2 }, 500);
          const event = new CustomEvent('shapeDragMove', { detail: {
              item,
            }
          });
          window.dispatchEvent(event);
        }
      },
      // DragOut
      (e: MouseEvent) => {
        if (e.which === 1) {
          item.animate({ 'fill-opacity': 0.0 }, 500);
          const event = new CustomEvent('shapeDragMove', { detail: {
              item,
            }
          });
          window.dispatchEvent(event);
        }
      })
  })
}

export default class RaphaelRenderer extends Renderer {
  canvas: any;
  lineStyle: { stroke: string; 'stroke-width': string; };
  
  /**
   * RaphaelRenderer - SVG graph rendering using Raphael library
   * 
   * Renders Dracula graph nodes and edges as SVG elements using Raphael.
   * Provides interactive features:
   * - Draggable nodes with real-time edge re-routing (dragify)
   * - Middle-mouse pan for canvas navigation (drag viewBox)
   * - Shape caching to avoid re-rendering unchanged elements
   * - Connection line updates as nodes move
   * 
   * Connection points calculated from 8 cardinal/intercardinal directions on each node bounding box.
   * Raphael generates unique colors for each node automatically.
   * 
   * @extends Renderer
   * @param {HTMLElement|string} element - DOM element or selector for canvas container
   * @param {Dracula} graph - Graph data structure to render
   * @param {number} width - Canvas width in pixels
   * @param {number} height - Canvas height in pixels
   */
  constructor(element: HTMLElement | string, graph: Dracula, width: number, height: number) {
    super(element, graph, width, height)
    this.canvas = Raphael(this.element, this.width, this.height)
    this.lineStyle = {
      stroke: '#443399',
      'stroke-width': '2px',
    }

    let drag: { elem: any | null; x: number; y: number; state: boolean } = {
        elem: null,
        x: 0,
        y: 0,
        state: false
    };
    let delta = {
        x: 0,
        y: 0
    };
    this.element.addEventListener("mousedown", (e: MouseEvent) => {
      if (!drag.state && e.which == 2) {
            drag.elem = this.element;
            drag.x = e.x;
            drag.y = e.y;
            drag.state = true;
        }
        return false;
    });

    this.element.addEventListener("mousemove", (e: MouseEvent) => {
      if (drag.state) {
        delta.x = e.x - drag.x;
        delta.y = e.y - drag.y;
        const svg = drag.elem.querySelector('svg');
        const viewBox = svg.hasAttribute('viewBox') ? svg.getAttribute('viewBox').split(' ').map(Number) : [0, 0, this.width, this.height];
        viewBox[0] -= delta.x;
        viewBox[1] -= delta.y;
        svg.setAttribute('viewBox', viewBox.join(' '));
        drag.elem.style.backgroundPosition = `${-viewBox[0]}px ${-viewBox[1]}px`;
        const event = new CustomEvent('viewDragMove', { detail: {
            viewBox
          }
        });
        window.dispatchEvent(event);
        drag.x = e.x;
        drag.y = e.y;
      }
    });

    this.element.addEventListener("mouseup", (e: MouseEvent) => {
      if (drag.state) {
        drag.state = false;
      }
    });
  }

  override drawNode(node: DraculaNode) {
    /**
     * Renders a graph node as an SVG rectangle with Raphael
     * 
     * Creates or updates a node's SVG representation:
     * - Draws rounded rectangle shape (150x80px with 10px corner radius)
     * - Assigns unique color from Raphael's color generator
     * - Sets fill opacity to 0 (transparent, with colored border)
     * - Translates shape to node's computed position
     * - Enables drag interactions via dragify() unless noDefaultDrag is set
     * - Initializes connections array for edge re-routing during drag
     * 
     * Caches shape in node object to avoid re-rendering on subsequent calls.
     * 
     * @override
     * @param {DraculaNode} node - Node to render with point[x,y] coordinates
     * @returns {void}
     */
    const color = Raphael.getColor()
    // TODO update / cache shape
    // if (node.shape) {
    //   node.shape.translate(node.point[0], node.point[1])
    //   return
    // }
    if (node.shape) {
     // node.shape = node.render(this.canvas, node)
    } else {
      node.shape = this.canvas.set();
      const rect = this.canvas.rect(0, 0, 150, 80, 10);
      node.shape
        .push(rect
          .attr({ stroke: color, 'stroke-width': 3, fill: color, 'fill-opacity': 0}));
        //.push(this.canvas.text(0, 30, node.label || node.id))
      node.shape.translate(node.point[0], node.point[1])
      node.shape.connections = []
      if (!node.noDefaultDrag) {
        dragify(node.shape)
      }
    }
  }

  override drawEdge(edge: DraculaEdge) {
    /**
     * Renders a connection line between two graph nodes using Raphael
     * 
     * Creates SVG Bezier curve connecting source and target node shapes.
     * Automatically calculates optimal connection points on 8 cardinal/intercardinal positions
     * on each node's bounding box to minimize line crossing.
     * 
     * Registers connections on both source and target shapes so edges are re-drawn
     * when nodes are dragged (called from dragify event handler).
     * 
     * @override
     * @param {DraculaEdge} edge - Edge with source/target DraculaNodes to connect
     * @returns {void}
     */
    if (!edge.shape) {
      edge.shape = this.canvas.connection(edge.source.shape, edge.target.shape, edge.style)
      // edge.shape.line.attr(this.lineStyle)
      edge.source.shape.connections.push(edge.shape)
      edge.target.shape.connections.push(edge.shape)
    }
  }
}

// <Raphael.fn.connection>

/* coordinates for potential connection coordinates from/to the objects */
const getConnectionPoints = (obj1: { getBBox: () => any; }, obj2: { getBBox: () => any; }): {x: number, y: number}[] => {
  /* get bounding boxes of target and source */
  const bb1 = obj1.getBBox()
  const bb2 = obj2.getBBox()

  const off1 = 0
  const off2 = 0

  return [

    /* NORTH 1 */
    { x: bb1.x + bb1.width / 2, y: bb1.y - off1 },

    /* SOUTH 1 */
    { x: bb1.x + bb1.width / 2, y: bb1.y + bb1.height + off1 },

    /* WEST  1 */
    { x: bb1.x - off1, y: bb1.y + bb1.height / 2 },

    /* EAST  1 */
    { x: bb1.x + bb1.width + off1, y: bb1.y + bb1.height / 2 },

    /* NORTH 2 */
    { x: bb2.x + bb2.width / 2, y: bb2.y - off2 },

    /* SOUTH 2 */
    { x: bb2.x + bb2.width / 2, y: bb2.y + bb2.height + off2 },

    /* WEST  2 */
    { x: bb2.x - off2, y: bb2.y + bb2.height / 2 },

    /* EAST  2 */
    { x: bb2.x + bb2.width + off2, y: bb2.y + bb2.height / 2 },

  ]
}

Raphael.fn.connection = function Connection(obj1: any, obj2: any, style: { [x: string]: any; directed: any; stroke: any; fill: string; label: any; callback: (arg0: { fg?: any; bg?: any; label?: any; draw(): void; }) => void; }) {
  const self = this

  /* create and return new connection */
  const edge: {
    fg?: any;
    bg?: any;
    label?: any;
    draw(): void;
  } = {

    /* eslint-disable complexity */
    draw() {
      const p = getConnectionPoints(obj1, obj2)

      /* distances between objects and according coordinates connection */
      const d = {}
      const dis: number[] = []
      let dx
      let dy

      /*
       * find out the best connection coordinates by trying all possible ways
       */
      /* loop the first object's connection coordinates */
      for (let i = 0; i < 4; i++) {
        /* loop the second object's connection coordinates */
        for (let j = 4; j < 8; j++) {
          dx = Math.abs(p[i].x - p[j].x)
          dy = Math.abs(p[i].y - p[j].y)
          if ((i === j - 4) || (((i !== 3 && j !== 6) || p[i].x < p[j].x) &&
            ((i !== 2 && j !== 7) || p[i].x > p[j].x) &&
            ((i !== 0 && j !== 5) || p[i].y > p[j].y) &&
            ((i !== 1 && j !== 4) || p[i].y < p[j].y))
          ) {
            dis.push(dx + dy)
            d[dis[dis.length - 1].toFixed(3)] = [i, j]
          }
        }
      }
      const res = dis.length === 0 ? [0, 4] : d[Math.min(...dis).toFixed(3)]

      /* bezier path */
      const x1 = p[res[0]].x
      const y1 = p[res[0]].y
      const x4 = p[res[1]].x
      const y4 = p[res[1]].y
      dx = Math.max(Math.abs(x1 - x4) / 2, 10)
      dy = Math.max(Math.abs(y1 - y4) / 2, 10)
      const x2 = [x1, x1, x1 - dx, x1 + dx][res[0]].toFixed(3)
      const y2 = [y1 - dy, y1 + dy, y1, y1][res[0]].toFixed(3)
      const x3 = [0, 0, 0, 0, x4, x4, x4 - dx, x4 + dx][res[1]].toFixed(3)
      const y3 = [0, 0, 0, 0, y4 - dy, y4 + dy, y4, y4][res[1]].toFixed(3)

      /* assemble path and arrow */
      let path = [
        `M${x1.toFixed(3)}`, y1.toFixed(3), `C${x2}`, y2, x3, y3,
        x4.toFixed(3), y4.toFixed(3),
      ].join(',')

      /* arrow */
      if (style && style.directed) {
        // magnitude, length of the last path vector
        const mag = Math.sqrt((y4 - y3) * (y4 - y3) + (x4 - x3) * (x4 - x3));
        // vector normalisation to specified length
        const norm = (x: number, l: null) => -x * (l || 5) / mag
        // calculate array coordinates (two lines orthogonal to the path vector)
        const arc = [{
          x: (norm(x4 - x3, null) + norm(y4 - y3, null) + x4).toFixed(3),
          y: (norm(y4 - y3, null) + norm(x4 - x3, null) + y4).toFixed(3),
        }, {
          x: (norm(x4 - x3, null) - norm(y4 - y3, null) + x4).toFixed(3),
          y: (norm(y4 - y3, null) - norm(x4 - x3, null) + y4).toFixed(3),
        }]
        path = `${path},M${arc[0].x},${arc[0].y},L${x4},${y4},L${arc[1].x},${arc[1].y}`
      }

      /* function to be used for moving existent path(s), e.g. animate() or attr() */
      const move = 'attr'

      /* applying path(s) */
      if (edge.fg) {
        edge.fg[move]({ path })
      } else {
        edge.fg = self.path(path)
          .attr({ stroke: style && style.stroke || '#FFF', fill: 'none', 'stroke-width': 2 })
          .toBack()
      }
      if (edge.bg) {
        edge.bg[move]({ path })
      } else if (style && style.fill && style.fill.split) {
        edge.bg = self.path(path).attr({
          stroke: style.fill.split('|')[0],
          fill: 'none',
          'stroke-width': style.fill.split('|')[1] || 3,
        }).toBack()
      }

      /* setting label */
      if (style && style.label) {
        if (edge.label) {
          edge.label.attr({ x: (x1 + x4) / 2, y: (y1 + y4) / 2 })
        } else {
          edge.label = self.text((x1 + x4) / 2, (y1 + y4) / 2, style.label)
            .attr({
              fill: '#000',
              'font-size': style['font-size'] || '10px',
              'fill-opacity': '0.6',
            });
        }
      }

      if (style && style.label && style['label-style'] && edge.label) {
        edge.label.attr(style['label-style'])
      }

      if (style && style.callback) {
        style.callback(edge)
      }
    },
  }
  edge.draw()
  return edge
}

// </Raphael.fn.connection>
