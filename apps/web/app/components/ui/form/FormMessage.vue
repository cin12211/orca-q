<script lang="ts" setup>
import { type HTMLAttributes, toValue } from 'vue';
import { ErrorMessage } from 'vee-validate';
import { cn } from '@/lib/utils';
import { useFormField } from './useFormField';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

const { name, formMessageId } = useFormField();
</script>

<template>
  <ErrorMessage
    :id="formMessageId"
    data-slot="form-message"
    as="p"
    :name="toValue(name)"
    :class="cn('text-destructive-foreground text-sm', props.class)"
  />
</template>
