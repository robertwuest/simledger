/**
 * Graph Dracula is a set of tools to display and layout interactive graphs, along with various related algorithms.
 Based on JavaScript and SVG.
 The code is released under the MIT license, so commercial use is not a problem.
 https://github.com/strathausen/dracula
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

export const Graph = dracula;

export const Layout = {
  OrderedTree: orderedTree,
  Spring: spring,
  TournamentTree: tournamentTree,
};

export const Renderer = {
  Raphael: raphael,
};
