<script setup lang="ts">
import type { Component } from 'vue';

const props = defineProps<{
  toolName: string;
  result: unknown;
  getToolComponent: (toolName: any) => Component | null;
}>();

const toolComponent = computed(() => props.getToolComponent(props.toolName));
const stringifyValue = (value: unknown) => JSON.stringify(value, null, 2);
</script>

<template>
  <component :is="toolComponent" v-if="toolComponent" :data="result" />
  <div v-else class="rounded-2xl border bg-muted/40">
    <pre class="overflow-x-auto px-3 py-3 leading-6 chat-code-text">{{
      stringifyValue(result)
    }}</pre>
  </div>
</template>
