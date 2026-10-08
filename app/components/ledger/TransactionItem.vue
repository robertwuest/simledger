<!--
  TransactionItem Component

  One transaction row: sender → recipient and the amount.
-->
<template>
  <li class="flex items-center gap-2 py-1.5 text-sm" data-testid="transaction-item">
    <UBadge v-if="block !== undefined" color="neutral" variant="soft" size="sm" class="font-mono">#{{ block }}</UBadge>
    <span class="flex min-w-0 flex-1 items-center gap-1.5">
      <AddressLabel :address="transaction.fromAddress" />
      <UIcon name="i-lucide-arrow-right" class="size-3.5 shrink-0 text-dimmed" />
      <AddressLabel :address="transaction.toAddress" />
    </span>
    <span class="shrink-0 font-medium tabular-nums text-highlighted" data-testid="transaction-amount">{{ transaction.amount }}</span>
  </li>
</template>

<script setup lang="ts">
import AddressLabel from './AddressLabel.vue';
import type { Transaction } from '~~/src/blockchain/transaction';

defineProps<{
  transaction: Pick<Transaction, 'fromAddress' | 'toAddress' | 'amount'>;
  /** Index of the block containing the transaction, shown as a badge */
  block?: number;
}>();
</script>
