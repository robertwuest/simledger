<template>
  <div class="sml-dashboard">
    <h1>Dashboard</h1>
  </div>
</template>

<script lang="ts">
/**
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 */
import { Options, Vue } from 'vue-class-component';

// TODO ----- relocate these componets

// -------

@Options({
  props: {
  }
})

export default class Dashboard extends Vue {
  created() {
    // let bc = new Blockchain();
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
