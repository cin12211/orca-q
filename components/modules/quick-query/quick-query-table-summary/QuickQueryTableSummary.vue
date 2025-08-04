<script lang="ts" setup>
import { Field, useForm } from 'vee-validate';

type Props = {
  summary: {
    tableSize?: string;
    dataSize?: string;
    indexSize?: string;
  };
};

const { summary } = defineProps<Props>();
</script>

<template>
  <div class="flex flex-col gap-2 text-xs p-2">
    <div class="flex items-center gap-2">
      <span>Table Size:</span>
      <span>{{ summary?.tableSize }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span>Data Size:</span>
      <span>{{ summary?.dataSize }}</span>
    </div>
    <div class="flex items-center gap-2">
      <span>Index Size:</span>
      <span>{{ summary?.indexSize }}</span>
    </div>
  </div>
</template>

<style lang="css" scoped></style>
