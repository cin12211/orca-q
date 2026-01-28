<template>
  <div class="gap-1 flex flex-col text-sm min-w-[10rem]">
    <div class="font-medium text-sm mb-1">{{ columnName }}</div>
    <div class="text-xs text-muted-foreground">Type: {{ dataType }}</div>
    <div class="text-xs text-muted-foreground">Table: {{ tableName }}</div>
    <div
      v-if="isPrimaryKey"
      class="text-xs text-yellow-500 mt-1 flex items-center gap-1"
    >
      <KeyRound class="w-4 text-yellow-400 text-xl" />

      <span>Primary Key</span>
    </div>
    <div
      v-if="foreignKey"
      class="text-xs text-blue-500 mt-1 flex items-center gap-1"
    >
      <KeyRound class="w-4 text-gray-400 text-xl" />
      <span
        >FK → {{ foreignKey.referenced_table }}.{{
          foreignKey.referenced_column
        }}</span
      >
    </div>
  </div>
</template>

<script lang="ts" setup>
import { KeyRound } from 'lucide-vue-next';

export interface ForeignKeyInfo {
  referenced_table: string;
  referenced_column: string;
}

defineProps<{
  columnName: string;
  dataType: string;
  tableName: string;
  isPrimaryKey: boolean;
  foreignKey?: ForeignKeyInfo;
}>();
</script>
