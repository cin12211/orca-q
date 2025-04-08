<template>
  <Card
    :class="[
      'flex cursor-pointer transition-all hover:bg-accent/50 hover:shadow-muted',
      selected
        ? 'border-border ring-2 ring-offset-0 ring-border shadow-md'
        : '',
    ]"
  >
    <CardContent class="flex items-center justify-center">
      <component :is="icon" :class="iconClass" />
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  name: string;
  icon: Component;
  selected: boolean;
  iconClass: HTMLElement["className"];
}>();
</script>
