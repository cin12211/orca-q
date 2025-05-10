<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { toTypedSchema } from '@vee-validate/zod';
import { Field, useForm } from 'vee-validate';
import * as z from 'zod';
import { uuidv4 } from '~/lib/utils';

export interface ConfigFieldItem {
  name: string;
  label: string;
  type: string;
  class?: HTMLAttributes['class'];
  titleClass?: HTMLAttributes['class'];
  as: Component;
}

export interface DynamicFormProps {
  fields: ConfigFieldItem[];
  validationSchema: z.ZodObject<any>;
  class?: HTMLAttributes['class'];
}

const props = defineProps<DynamicFormProps>();

const form = useForm({
  validationSchema: toTypedSchema(props.validationSchema),
  name: `dynamic-form-${uuidv4()}`,
});

defineExpose({
  form,
});
</script>

<template>
  <div :class="props.class">
    <div v-for="field in fields" :key="field.name">
      <div :class="['flex justify-between pb-0.5', field.titleClass]">
        <label class="text-xs font-medium text-right" :for="field.name">{{
          field.label
        }}</label>

        <label class="text-xs text-right" :for="field.name">{{
          field.type
        }}</label>
      </div>

      <Field
        :as="field.as"
        :id="field.name"
        :name="field.name"
        :class="field.class"
      />
    </div>
  </div>
</template>
