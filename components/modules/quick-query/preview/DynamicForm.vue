<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { toTypedSchema } from '@vee-validate/zod';
import { Field, useForm } from 'vee-validate';
import * as z from 'zod';
import { uuidv4 } from '~/core/helpers';

export interface ConfigFieldItem {
  name: string;
  label: string;
  type: string;
  class?: HTMLAttributes['class'];
  titleClass?: HTMLAttributes['class'];
  as: Component;
  placeholder?: string;
  isShow?: boolean;
  /**
   * Render this component instead of a form field, for values a text input
   * cannot show faithfully (e.g. binary). It is display-only and not part of
   * the form values.
   */
  component?: Component;
  componentProps?: Record<string, unknown>;
  /** Remount key for `component`, so it re-reads a changed value. */
  componentKey?: string;
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
    <div v-for="field in fields" :key="field.name" v-show="field.isShow">
      <div :class="['flex justify-between pb-0.5', field.titleClass]">
        <label class="text-xs text-right" :for="field.name">{{
          field.label
        }}</label>

        <label class="text-xs text-right text-primary/80" :for="field.name">{{
          field.type
        }}</label>
      </div>

      <component
        :is="field.component"
        v-if="field.component"
        :key="field.componentKey"
        v-bind="field.componentProps"
      />
      <Field
        v-else
        :as="field.as"
        :id="field.name"
        :name="field.name"
        :class="field.class"
        :placeholder="field.placeholder"
      />
    </div>
  </div>
</template>
