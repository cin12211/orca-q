<script setup lang="ts">
import { cn } from '@/lib/utils';
import type {
  SchemaDiffResponse,
  DiffStatus,
} from '../types/schema-diff.types';

const { result } = defineProps<{
  result: SchemaDiffResponse;
}>();

const expandedSchemas = ref<Set<string>>(new Set());
const expandedTables = ref<Set<string>>(new Set());

const statusConfig: Record<
  DiffStatus,
  { label: string; class: string; icon: string }
> = {
  added: {
    label: 'Added',
    class: 'text-emerald-600 dark:text-emerald-400',
    icon: 'hugeicons:plus-sign',
  },
  removed: {
    label: 'Removed',
    class: 'text-red-600 dark:text-red-400',
    icon: 'hugeicons:minus-sign',
  },
  modified: {
    label: 'Modified',
    class: 'text-amber-600 dark:text-amber-400',
    icon: 'hugeicons:edit-02',
  },
  unchanged: {
    label: 'Unchanged',
    class: 'text-muted-foreground',
    icon: 'hugeicons:check-01',
  },
};

const badgeVariant: Record<string, string> = {
  added:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-sm',
  removed:
    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded-sm',
  modified:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 rounded-sm',
};

const toggleSchema = (name: string) => {
  if (expandedSchemas.value.has(name)) expandedSchemas.value.delete(name);
  else expandedSchemas.value.add(name);
};

const toggleTable = (key: string) => {
  if (expandedTables.value.has(key)) expandedTables.value.delete(key);
  else expandedTables.value.add(key);
};

const tableKey = (schema: string, table: string) => `${schema}.${table}`;

const filteredSchemas = computed(() =>
  result.schemas.filter(
    s =>
      s.tables.some(t => t.status !== 'unchanged') ||
      s.views.some(v => v.status !== 'unchanged') ||
      s.functions.some(f => f.status !== 'unchanged')
  )
);

// Expand schemas with changes on first render
onMounted(() => {
  for (const s of filteredSchemas.value) {
    expandedSchemas.value.add(s.name);
  }
});
</script>
<template>
  <div class="space-y-1 font-mono text-sm">
    <!-- Summary chips -->
    <div class="mb-3 flex flex-wrap gap-2">
      <template v-for="(count, key) in result.summary" :key="key">
        <Badge
          v-if="key !== 'unchanged'"
          variant="outline"
          :class="cn(badgeVariant[key as string], 'capitalize border-0')"
        >
          {{ count }} {{ key }}
        </Badge>
      </template>
    </div>

    <!-- Schema groups (only those with changes) -->
    <div
      v-for="schema in filteredSchemas"
      :key="schema.name"
      class="rounded-md border overflow-hidden"
    >
      <!-- Schema header -->
      <button
        class="flex w-full items-center gap-2 bg-muted/50 px-3 py-2 text-left text-xs font-semibold capitalize text-muted-foreground hover:bg-muted"
        @click="toggleSchema(schema.name)"
      >
        <Icon
          :name="
            expandedSchemas.has(schema.name)
              ? 'hugeicons:arrow-down-01'
              : 'hugeicons:arrow-right-01'
          "
          class="size-3.5 shrink-0"
        />
        <Icon name="hugeicons:database" class="size-3.5 shrink-0" />
        {{ schema.name }}
      </button>

      <!-- Schema content -->
      <div v-if="expandedSchemas.has(schema.name)" class="divide-y">
        <!-- Tables section -->
        <template
          v-for="table in schema.tables.filter(t => t.status !== 'unchanged')"
          :key="table.name"
        >
          <!-- Table row -->
          <div
            class="flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-muted/30"
            :class="statusConfig[table.status].class"
            @click="toggleTable(tableKey(schema.name, table.name))"
          >
            <Icon
              :name="
                expandedTables.has(tableKey(schema.name, table.name))
                  ? 'hugeicons:arrow-down-01'
                  : 'hugeicons:arrow-right-01'
              "
              class="size-3 shrink-0 text-muted-foreground"
            />
            <Icon name="hugeicons:table-01" class="size-3.5 shrink-0" />
            <span class="flex-1 truncate">{{ table.name }}</span>
            <span
              class="ml-auto shrink-0 rounded px-1.5 py-0.5 text-xxs font-medium capitalize"
              :class="badgeVariant[table.status]"
              >{{ table.status }}</span
            >
          </div>

          <!-- Column details -->
          <template
            v-if="expandedTables.has(tableKey(schema.name, table.name))"
          >
            <div
              v-for="col in table.columns.filter(c => c.status !== 'unchanged')"
              :key="col.name"
              class="flex items-center gap-2 py-1.5 pl-10 pr-4"
              :class="statusConfig[col.status].class"
            >
              <Icon
                name="hugeicons:columns-02"
                class="size-3 shrink-0 opacity-60"
              />
              <span class="flex-1 truncate text-xs">{{ col.name }}</span>
              <span class="shrink-0 text-xxs text-muted-foreground">
                <template v-if="col.status === 'added'">
                  {{ col.source?.type }}
                </template>
                <template v-else-if="col.status === 'removed'">
                  {{ col.target?.type }}
                </template>
                <template v-else-if="col.changes?.type">
                  {{ (col.changes.type as any).from }} →
                  {{ (col.changes.type as any).to }}
                </template>
              </span>
              <span
                class="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium capitalize"
                :class="badgeVariant[col.status]"
                >{{ col.status }}</span
              >
            </div>

            <!-- FK diffs -->
            <div
              v-for="fk in table.foreignKeys.filter(
                f => f.status !== 'unchanged'
              )"
              :key="fk.key"
              class="flex items-center gap-2 py-1.5 pl-10 pr-4"
              :class="statusConfig[fk.status].class"
            >
              <Icon
                name="hugeicons:link-01"
                class="size-3 shrink-0 opacity-60"
              />
              <span class="flex-1 truncate text-xs">{{ fk.key }}</span>
              <span
                class="shrink-0 rounded px-1 py-0.5 text-[9px] font-medium capitalize"
                :class="badgeVariant[fk.status]"
                >{{ fk.status }}</span
              >
            </div>
          </template>
        </template>

        <!-- Views section -->
        <div
          v-for="view in schema.views.filter(v => v.status !== 'unchanged')"
          :key="view.name"
          class="flex items-center gap-2 px-4 py-2"
          :class="statusConfig[view.status].class"
        >
          <Icon name="hugeicons:eye" class="size-3.5 shrink-0" />
          <span class="flex-1 truncate">{{ view.name }}</span>
          <span class="ml-2 shrink-0 text-xxs text-muted-foreground">view</span>
          <span
            class="ml-auto shrink-0 rounded px-1.5 py-0.5 text-xxs font-medium capitalize"
            :class="badgeVariant[view.status]"
            >{{ view.status }}</span
          >
        </div>

        <!-- Functions section -->
        <div
          v-for="fn in schema.functions.filter(f => f.status !== 'unchanged')"
          :key="fn.signature"
          class="flex items-center gap-2 px-4 py-2"
          :class="statusConfig[fn.status].class"
        >
          <Icon name="hugeicons:function-of-x" class="size-3.5 shrink-0" />
          <span class="flex-1 truncate">{{ fn.name }}</span>
          <span class="ml-2 shrink-0 text-xxs text-muted-foreground">fn</span>
          <span
            class="ml-auto shrink-0 rounded px-1.5 py-0.5 text-xxs font-medium capitalize"
            :class="badgeVariant[fn.status]"
            >{{ fn.status }}</span
          >
        </div>
      </div>
    </div>

    <!-- No differences -->
    <div
      v-if="filteredSchemas.length === 0"
      class="flex flex-col items-center gap-2 py-12 text-muted-foreground"
    >
      <Icon
        name="hugeicons:checkmark-circle-02"
        class="size-10 text-emerald-500"
      />
      <p class="text-sm font-medium">Schemas are identical</p>
      <p class="text-xs">No differences detected between source and target.</p>
    </div>
  </div>
</template>
