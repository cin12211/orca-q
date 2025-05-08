<script setup lang="ts">
import { h } from 'vue';
import { toast } from 'vue-sonner';
import * as z from 'zod';
import {
  AutoForm,
  AutoFormField,
  type ConfigItem,
} from '@/components/ui/auto-form';
import { Button } from '@/components/ui/button';
import { mapPgTypeToTsType } from '~/utils/quickQuery/mapPgTypeToTsType';

const props = defineProps<{
  columnTypes: {
    name: string;
    type: string;
  }[];
}>();

const rowSchema: Record<
  string,
  z.ZodOptional<
    z.ZodString | z.ZodNumber | z.ZodBoolean | z.ZodEnum<['TRUE', 'FALSE']>
  >
> = {};

const fieldConfig: Record<string, ConfigItem> = {};

props.columnTypes.forEach(column => {
  const tsType = mapPgTypeToTsType(column.type);

  if (tsType === 'boolean') {
    //TODO:fix UI
    const zodType = z.enum(['TRUE', 'FALSE']).optional();

    rowSchema[column.name] = zodType;
  } else if (tsType === 'number') {
    const zodType = z.coerce.number().optional();
    rowSchema[column.name] = zodType;
  } else {
    const zodType = z.string().optional();
    rowSchema[column.name] = zodType;
  }

  fieldConfig[column.name] = {
    label: column.name,
    inputProps: {
      placeholder: 'Placeholder',
      class: 'h-7',
    },
  };
});

const schema = z.object({
  ...rowSchema,
});

function onSubmit(values: Record<string, any>) {
  toast({
    title: 'You submitted the following values:',
    description: h(
      'pre',
      { class: 'mt-2 w-[340px] rounded-md bg-slate-950 p-4' },
      h('code', { class: 'text-white' }, JSON.stringify(values, null, 2))
    ),
  });
}
</script>

<template>
  <AutoForm
    class="space-y-1 p-2"
    :schema="schema"
    :field-config="fieldConfig"
    @submit="onSubmit"
  >
    <template #acceptTerms="slotProps">
      <AutoFormField v-bind="slotProps" />
    </template>

    <template #customParent="slotProps">
      <div class="flex items-end space-x-2">
        <AutoFormField v-bind="slotProps" class="w-full" />
      </div>
    </template>
  </AutoForm>
</template>
