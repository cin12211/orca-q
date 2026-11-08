<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Simple bordered table used by every insights section. */
defineProps<{
  columns: { key: string; label: string; class?: string; title?: string }[];
  rows: Record<string, unknown>[];
  rowKey: string;
  emptyText: string;
}>();
</script>

<template>
  <p v-if="!rows.length" class="text-xs text-muted-foreground">
    {{ emptyText }}
  </p>
  <div v-else class="overflow-auto rounded-lg border">
    <Table class="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead
            v-for="column in columns"
            :key="column.key"
            :class="column.class"
            :title="column.title"
          >
            {{ column.label }}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in rows" :key="String(row[rowKey])">
          <TableCell
            v-for="column in columns"
            :key="column.key"
            :class="column.class"
          >
            <slot :name="`cell-${column.key}`" :row="row">
              {{ row[column.key] ?? '-' }}
            </slot>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
