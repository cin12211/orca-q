<script setup lang="ts">
import { Icon } from '#components';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

withDefaults(
  defineProps<{
    title?: string;
    desc?: string;
    icon?: string;
  }>(),
  {
    icon: 'icons:not-found',
  }
);
</script>

<template>
  <Empty class="h-full">
    <EmptyHeader>
      <Icon class="size-32!" :name="icon" />

      <EmptyTitle v-if="title" class="text-foreground">{{ title }}</EmptyTitle>
      <EmptyDescription v-if="desc">
        {{ desc }}
      </EmptyDescription>

      <div v-if="$slots.default" class="mt-2">
        <slot />
      </div>
    </EmptyHeader>
  </Empty>
</template>
