<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { BaseEmpty, Textarea } from '#components';
import * as z from 'zod';
import AgTextCellEditor from '~/components/base/data-grid/components/AgTextCellEditor.vue';
import { cellValueFormatter } from '~/components/base/data-grid/utils';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { isSerializedBinaryValue } from '~/core/helpers/binary-value';
import { isBinaryColumnType } from '~/core/helpers/sql-column-type';
import { getSqlDialect } from '~/core/sql-dialect';
import DynamicForm, { type ConfigFieldItem } from './DynamicForm.vue';

const props = defineProps<{
  columnTypes: {
    name: string;
    type: string;
  }[];
  selectedRow: Record<string, any> | null;
}>();

const rowSchema = computed<
  Record<string, z.ZodOptional<z.ZodString | z.ZodNumber | z.ZodBoolean>>
>(() => {
  const schema: Record<string, any> = {};

  props.columnTypes.forEach(column => {
    //TODO: support more db types
    const tsType = getSqlDialect(DatabaseClientType.POSTGRES).mapDbTypeToTsType(
      column.type
    );

    if (tsType === 'boolean') {
      schema[column.name] = z.coerce.boolean().optional();
    } else if (tsType === 'number') {
      schema[column.name] = z.coerce.number().optional();
    } else {
      schema[column.name] = z.string().optional();
    }
  });

  return schema;
});

const searchInput = shallowRef('');
// Bumped per selected row so binary viewers re-read the new row's bytes.
const selectedRowVersion = ref(0);
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const configFields = computed<ConfigFieldItem[]>(() => {
  const fields: ConfigFieldItem[] = [];

  const search = debouncedSearch.value.toLowerCase().trim();

  props.columnTypes.forEach(column => {
    const columnName = column.name.toLowerCase();
    const isShow = search ? columnName.includes(search) : true;
    const value = props.selectedRow?.[column.name];
    // Binary is decoded by the same viewer the grid editor uses, instead of
    // showing the raw `{ type: 'Buffer', data: [...] }` JSON.
    const isBinary =
      isBinaryColumnType(column.type) || isSerializedBinaryValue(value);

    fields.push({
      label: column.name,
      type: column.type,
      as: Textarea,
      name: column.name,
      class: 'px-1 py-0.5 h-fit min-h-6! text-primary/80 font-normal!',
      placeholder: 'NULL',
      isShow,
      ...(isBinary && {
        component: AgTextCellEditor,
        componentProps: { value, valueKind: 'binary', readonly: true },
        componentKey: `${column.name}-${selectedRowVersion.value}`,
      }),
    });
  });

  return fields;
});

/**
 * Whether search returns empty
 */
const isEmpty = computed(() => {
  const search = debouncedSearch.value.toLowerCase().trim();
  if (!search) return false;
  return !props.columnTypes.some(col =>
    col.name.toLowerCase().includes(search)
  );
});

const schema = computed(() => z.object(rowSchema.value));

const dynamicForm = ref<InstanceType<typeof DynamicForm>>();

const setFormValues = (selectedRow: Record<string, unknown>) => {
  const mappedSelectedRow: Record<string, unknown> = Object.entries(
    selectedRow
  ).reduce((acc: Record<string, unknown>, [key, value]) => {
    acc[key] = cellValueFormatter(value || '');
    return acc;
  }, {});

  nextTick(() => {
    dynamicForm.value?.form.setValues(mappedSelectedRow);
  });
};

watch(
  () => [props.selectedRow, dynamicForm],
  ([selectedRow]) => {
    if (selectedRow) {
      selectedRowVersion.value += 1;
      setFormValues(selectedRow as Record<string, unknown>);
    }
  },
  {
    immediate: true,
    deep: true,
  }
);
</script>

<template>
  <div class="p-2 pb-0">
    <div class="relative w-full">
      <div class="absolute left-1.5 top-1.5 w-4">
        <Icon name="lucide:search" class="stroke-3!" />
      </div>

      <Input
        type="text"
        placeholder="Search fields ..."
        class="pr-6 pl-6 w-full h-8"
        v-model="searchInput"
      />

      <div
        v-if="searchInput"
        class="absolute right-2 top-1.5 w-4 cursor-pointer rounded-md hover:bg-accent"
        @click="searchInput = ''"
      >
        <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
      </div>
    </div>
  </div>

  <BaseEmpty
    v-if="isEmpty"
    title="No results"
    desc="No fields match your search."
  />

  <DynamicForm
    v-else
    ref="dynamicForm"
    class="space-y-1 p-2 overflow-y-auto"
    :fields="configFields"
    :validation-schema="schema"
  />
</template>
