<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { SelectLabel, type SelectLabelProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps<
  SelectLabelProps & { class?: HTMLAttributes['class'] }
>();
</script>
<template>
  <SelectLabel
    data-slot="select-label"
    :class="
      cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', props.class)
    "
  >
    <slot />
  </SelectLabel>
</template>
