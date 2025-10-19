<script setup lang="ts">
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
      <EmptyMedia variant="icon">
        <!-- Empty icon -->
        <!-- <FolderCode /> -->
      </EmptyMedia>
      <EmptyTitle>{{ title }}</EmptyTitle>
      <EmptyDescription>
        {{ desc }}
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
</template>
