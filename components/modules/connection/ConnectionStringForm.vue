<script setup lang="ts">
import { Icon } from '#components';

defineProps<{
  placeholderString: string;
  connectionString: string;
}>();

defineEmits<{
  (e: 'update:connectionString', value: string): void;
}>();
</script>
<template>
  <Label for="connection-string" class="flex items-center gap-2">
    <Icon name="lucide:align-justify" />
    Connection String
  </Label>

  <Input
    id="connection-string"
    :placeholder="placeholderString"
    :model-value="connectionString"
    @update:model-value="$emit('update:connectionString', $event as string)"
    class="font-mono text-sm"
  />
  <p class="text-xs text-muted-foreground">Example: {{ placeholderString }}</p>
</template>
