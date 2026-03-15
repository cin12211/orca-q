<script setup lang="ts">
import { Icon } from '#components';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

defineProps<{ title?: string; desc?: string }>();
</script>

<template>
  <Empty>
    <EmptyHeader>
      <Icon class="size-32!" name="icons:not-found" />

      <EmptyTitle class="text-foreground">{{ title }}</EmptyTitle>
      <EmptyDescription>
        {{ desc }}
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
</template>
