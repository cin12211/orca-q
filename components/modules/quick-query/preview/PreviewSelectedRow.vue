<script setup lang="ts">
import { Textarea } from '#components';
import * as z from 'zod';
import { mapPgTypeToTsType } from '~/utils/quickQuery/mapPgTypeToTsType';
import DynamicForm, { type ConfigFieldItem } from './DynamicForm.vue';

const props = defineProps<{
  columnTypes: {
    name: string;
    type: string;
  }[];
  selectedRow: Record<string, any> | null;
}>();

const rowSchema: Record<
  string,
  z.ZodOptional<z.ZodString | z.ZodNumber | z.ZodBoolean>
> = {};

const configFields: ConfigFieldItem[] = [];

props.columnTypes.forEach(column => {
  const tsType = mapPgTypeToTsType(column.type);

  if (tsType === 'boolean') {
    //TODO:fix UI
    // const zodType = z.enum(['TRUE', 'FALSE']).optional();
    const zodType = z.coerce.boolean().optional();

    rowSchema[column.name] = zodType;
  } else if (tsType === 'number') {
    const zodType = z.coerce.number().optional();
    rowSchema[column.name] = zodType;
  } else {
    const zodType = z.string().optional();
    rowSchema[column.name] = zodType;
  }

  configFields.push({
    label: column.name,
    type: column.type,
    as: Textarea,
    name: column.name,
    class: 'px-1 py-0.5 h-fit min-h-6! font-normal!',
  });
});

const schema = z.object({
  ...rowSchema,
});

const dynamicForm = ref<InstanceType<typeof DynamicForm>>();

watch(
  () => props.selectedRow,
  () => {
    dynamicForm.value?.form.resetForm();

    if (!props.selectedRow) {
      return;
    }

    dynamicForm.value?.form.setValues(props.selectedRow);
  }
);
</script>

<template>
  <DynamicForm
    ref="dynamicForm"
    class="space-y-1 p-2 overflow-y-auto"
    :fields="configFields"
    :validation-schema="schema"
  />
</template>
