<script setup lang="ts">
import type { AgentDescribeTableResult } from '../db-agent.types';

defineProps<{
  data: AgentDescribeTableResult;
}>();
</script>

<template>
  <div class="space-y-4 rounded-[1.35rem] border border-border/70 bg-muted/20 p-4">
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <Icon name="lucide:table-properties" class="size-4 text-primary" />
        <div class="text-base font-semibold">
          {{ data.tableName }}
        </div>
      </div>

      <p class="text-sm leading-6 text-foreground/90">
        {{ data.summary }}
      </p>
    </div>

    <div class="overflow-hidden rounded-2xl border bg-background/90">
      <div class="border-b px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Columns
      </div>

      <div class="divide-y divide-border/70">
        <div
          v-for="column in data.columns"
          :key="column.name"
          class="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <div class="font-mono text-[13px]">
              {{ column.name }}
            </div>
            <div class="mt-1 text-xs leading-5 text-muted-foreground">
              {{ column.description || 'No description available.' }}
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="outline" class="text-[10px] tracking-[0.16em]">
              {{ column.type }}
            </Badge>
            <Badge v-if="column.isPrimaryKey" variant="secondary" class="text-[10px] tracking-[0.16em]">
              PK
            </Badge>
            <Badge v-if="column.isForeignKey" variant="secondary" class="text-[10px] tracking-[0.16em]">
              FK<span v-if="column.referencesTable" class="ml-1">-> {{ column.referencesTable }}</span>
            </Badge>
            <Badge v-if="column.isNullable" variant="outline" class="text-[10px] tracking-[0.16em]">
              nullable
            </Badge>
          </div>
        </div>
      </div>
    </div>

    <div v-if="data.relatedTables.length > 0" class="space-y-2">
      <div class="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Related Tables
      </div>

      <div class="flex flex-wrap gap-2">
        <Badge
          v-for="table in data.relatedTables"
          :key="table"
          variant="outline"
          class="text-[10px] tracking-[0.16em]"
        >
          {{ table }}
        </Badge>
      </div>
    </div>
  </div>
</template>
