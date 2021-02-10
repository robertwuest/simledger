<template>
  <div id="app">
    <div id="nav">
      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>
    </div>
    <router-view/>
  </div>
</template>

<style lang="scss">
  @import 'assets/scss/main.scss';

  #app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: var(--text-color);
    background: var(--background-color);
  }

  #nav {
    padding: 30px;

    a {
      font-weight: bold;
      color: var(--link-color);

      &.router-link-exact-active {
        color: var(--link-active-color);
      }
    }
  }
</style>
