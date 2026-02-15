<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import { Textarea } from '#components';
import * as z from 'zod';
import { cellValueFormatter } from '~/components/base/dynamic-table/utils';
import { mapPgTypeToTsType } from '~/components/modules/quick-query/utils/mapPgTypeToTsType';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
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
    const tsType = mapPgTypeToTsType(column.type);

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
const debouncedSearch = refDebounced(searchInput, DEFAULT_DEBOUNCE_INPUT);

const configFields = computed<ConfigFieldItem[]>(() => {
  const fields: ConfigFieldItem[] = [];

  const search = debouncedSearch.value.toLowerCase().trim();

  props.columnTypes.forEach(column => {
    const columnName = column.name.toLowerCase();
    const isShow = search ? columnName.includes(search) : true;

    fields.push({
      label: column.name,
      type: column.type,
      as: Textarea,
      name: column.name,
      class: 'px-1 py-0.5 h-fit min-h-6! text-primary/80 font-normal!',
      placeholder: 'NULL',
      isShow,
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
  <div class="relative w-full p-1">
    <div class="absolute left-3 top-2.5 w-4">
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
      class="absolute right-3 top-2.5 w-4 cursor-pointer rounded-md hover:bg-accent"
      @click="searchInput = ''"
    >
      <Icon name="lucide:x" class="stroke-3! text-muted-foreground" />
    </div>
  </div>

  <div v-if="isEmpty" class="flex items-center justify-center h-40">
    No field match!
  </div>
  <DynamicForm
    v-else
    ref="dynamicForm"
    class="space-y-1 p-1 overflow-y-auto"
    :fields="configFields"
    :validation-schema="schema"
  />
</template>
