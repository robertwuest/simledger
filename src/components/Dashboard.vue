<template>
  <div class="sml-dashboard">
    <h1>Dashboard</h1>
    <div class="nodes">
      <div v-bind:class="{ 'nodes__node--mining' : node.isMining === true }" class="nodes__node" v-for="node in nodes" :key="node.id">
        <h2>{{ node.id }}</h2>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * This code is based on the original implementations by Xavier Decuyper https://www.codementor.io/@savjee
 */
import { Component, Vue, Prop } from 'vue-property-decorator';
import { SystemNode } from '../network/system_node';
import SmlCommon from '../common';
import { System } from '../network/system';
// import { Blockchain } from '../blockchain/blockchain';

@Component
export default class Dashboard extends Vue {
  @Prop({ default: () => [] }) nodes!: SystemNode[];
  // Data property
  myDataProperty!: string;

  // Lifecycle hook
  mounted() {
    this.myDataProperty = 'Boop';
  }

  // Component method
  updateMyProperty($event: any) {
    this.myDataProperty = $event.target.value;
  }

  created() {
    // Genesis account
    const admin = SmlCommon.generateKeyPair();
    const adminBS58 = {
      pub: SmlCommon.HexToBase58(admin.getPublic(true, 'hex')),
      pk: SmlCommon.HexToBase58(admin.getPrivate('hex')),
    };
    // Setup system and two example nodes
    const system = new System();
    this.nodes.push(new SystemNode('Bob', adminBS58.pub, system));
    this.nodes.push(new SystemNode('Alice', adminBS58.pub, system));

    // mutually connect the nodes
    this.nodes[0].connectToNode(this.nodes[1]);

    console.log(this.nodes[0]);
    console.log(this.nodes[1]);

    system.start();

    this.nodes[0].startMining();
    this.nodes[1].startMining();

    /* const bc = new Blockchain(adminBS58.pub);
    const alice = SmlCommon.generateKeyPair();
    const aliceBS58 = {
      pub: SmlCommon.HexToBase58(alice.getPublic(true,'hex')),
      pk: SmlCommon.HexToBase58(alice.getPrivate('hex')),
    };
    bc.minePendingTransactions(SmlCommon.HexToBase58(alice.getPublic(true, 'hex')));
    // bc.isChainValid();
    const adminToAlice = new Transaction(adminBS58.pub, aliceBS58.pub, 5);
    adminToAlice.signTransaction(admin);
    bc.addTransaction(adminToAlice);
    bc.minePendingTransactions(adminBS58.pub);
    bc.isChainValid();
    console.log('Balance of admin: ' + bc.getBalanceOfAddress(adminBS58.pub));
    console.log('Balance of alice: ' + bc.getBalanceOfAddress(aliceBS58.pub));
    console.log(bc); */
  }
}
</script>

<style scoped lang="scss">
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

  .nodes {
    display: flex;

    &__node {
      width: 200px;
      border: 1px solid darkgrey;
      border-radius: 12px;
      margin: 20px;
      padding: 10px;
      text-align: left;

      &--mining {
        animation: pulse-animation 1s infinite;
      }
    }
  }

  @keyframes pulse-animation {
    0% {
      box-shadow: 0 0 0 0px rgba(0, 0, 255, 0.2);
    }
    100% {
      box-shadow: 0 0 0 20px rgba(0, 0, 255, 0);
    }
  }

</style>
