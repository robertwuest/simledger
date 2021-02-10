<template>
  <div class="home">
    <img class="logo" alt="Vue logo" src="../assets/logo.png">
    <Dashboard />
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Dashboard from '@/components/Dashboard.vue'; // @ is an alias to /src

@Component({
  components: {
    Dashboard,
  },
})
export default class Home extends Vue {}
</script>

<style lang="scss">
  .logo {
    height: 80px;
  }
</style>
