<!--
  Dashboard Component

  Main layout of the blockchain network simulator:
  - GraphViewer (top left): Network topology visualization
  - NodeExplorer (top right): Blockchain state explorer
  - LogConsole (bottom left): Node log messages
  - NodeEditor (bottom right): Transaction and mining controls

  All panes share the network store provided by the app.
-->
<template>
  <div class="sml-dashboard">
    <Splitpanes class="default-theme" horizontal>
      <Pane size="65">
        <Splitpanes class="default-theme" vertical>
          <Pane size="75" class="sml-dashboard__container">
            <PaneHeader title="Graph Viewer" />
            <GraphViewer />
          </Pane>
          <Pane class="sml-dashboard__container">
            <NodeExplorer />
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane>
        <Splitpanes class="default-theme" vertical>
          <Pane class="sml-dashboard__container">
            <LogConsole />
          </Pane>
          <Pane class="sml-dashboard__container">
            <NodeEditor />
          </Pane>
        </Splitpanes>
      </Pane>
    </Splitpanes>
  </div>
</template>

<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes';
import 'splitpanes/dist/splitpanes.css';
import GraphViewer from './graph/GraphViewer.vue';
import NodeExplorer from './NodeExplorer.vue';
import NodeEditor from './NodeEditor.vue';
import LogConsole from './LogConsole.vue';
import PaneHeader from './PaneHeader.vue';
</script>

<style>
  .sml-dashboard {
    flex-grow: 1;
    min-height: 0;
  }
  .sml-dashboard__container {
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .default-theme.splitpanes .splitpanes__pane {
    background-color: transparent;
  }
  .default-theme.splitpanes.splitpanes--vertical > .splitpanes__splitter,
  .default-theme.splitpanes.splitpanes--horizontal > .splitpanes__splitter {
    background-color: var(--ui-bg-accented);
    border-color: transparent;
  }
  .default-theme.splitpanes.splitpanes--vertical > .splitpanes__splitter:before,
  .default-theme.splitpanes.splitpanes--horizontal > .splitpanes__splitter:before,
  .default-theme.splitpanes.splitpanes--vertical > .splitpanes__splitter:after,
  .default-theme.splitpanes.splitpanes--horizontal > .splitpanes__splitter:after {
    background-color: var(--ui-bg-muted);
  }
</style>
