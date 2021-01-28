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
/*import {Blockchain} from "@/blockchain/blockchain";
import {Transaction} from "@/blockchain/transaction";*/
import SmlCommon from "@/common";
import {System} from "@/network/system";
import {SystemNode} from "@/network/system_node";

@Options({
  props: {
  }
})

export default class Dashboard extends Vue {
  created() {
    // Genesis account
    const admin = SmlCommon.generateKeyPair();
    const adminBS58 = {
     pub: SmlCommon.HexToBase58(admin.getPublic(true,'hex')),
     pk: SmlCommon.HexToBase58(admin.getPrivate('hex')),
    };
    // Setup system and two example nodes
    const system = new System();
    const node0 = new SystemNode('Bob', adminBS58.pub, system);
    const node1 = new SystemNode('Alice', adminBS58.pub, system);

    // mutually connect the nodes
    node0.connectToNode(node1);

    console.log(node0);
    console.log(node1);

    system.start();
    /*
    let bc = new Blockchain(adminBS58.pub);
    bc.addTransaction(new Transaction("_", adminBS58.pub, bc.miningReward));
    const alice = SmlCommon.generateKeyPair();
    const aliceBS58 = {
      pub: SmlCommon.HexToBase58(alice.getPublic(true,'hex')),
      pk: SmlCommon.HexToBase58(alice.getPrivate('hex')),
    };
    bc.minePendingTransactions(SmlCommon.HexToBase58(alice.getPublic(true,'hex')));
    bc.isChainValid();
    const adminToAlice = new Transaction(adminBS58.pub, aliceBS58.pub, 5);
    adminToAlice.signTransaction(admin);
    bc.addTransaction(adminToAlice);
    bc.minePendingTransactions(adminBS58.pub);
    bc.isChainValid();
    console.log('Balance of admin: ' + bc.getBalanceOfAddress(adminBS58.pub));
    console.log('Balance of alice: ' + bc.getBalanceOfAddress(aliceBS58.pub));
    console.log(bc);
    */
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
