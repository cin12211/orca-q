<template>
  <div class="gap-1 flex flex-col text-sm min-w-[20rem]">
    <div class="font-medium text-sm mb-1">
      {{ tableName }} ({{ schemaName || 'public' }})
    </div>
    <div class="text-xs text-muted-foreground">
      Columns: {{ columns.length }}
    </div>
    <div v-if="pkColumns.length > 0" class="text-xs text-muted-foreground">
      Primary Keys: {{ pkColumns.join(', ') }}
    </div>
    <div v-if="fkColumns.length > 0" class="text-xs text-muted-foreground">
      Foreign Keys: {{ fkColumns.join(', ') }}
    </div>
    <div class="mt-1 text-xs max-h-[12rem] overflow-auto">
      <div
        v-for="col in columns"
        :key="col.name"
        class="py-0.5"
        :class="{ 'font-semibold': pkColumns.includes(col.name) }"
      >
        {{ col.name }}:
        <span class="text-muted-foreground">{{ col.short_type_name }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
export interface ColumnInfo {
  name: string;
  short_type_name: string;
}

const props = defineProps<{
  schemaName?: string;
  tableName: string;
  columns: ColumnInfo[];
  pkColumns: string[];
  fkColumns: string[];
}>();
</script>
