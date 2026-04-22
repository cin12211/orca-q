<script setup lang="ts">
import { Icon } from '#components';

const props = defineProps<{
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  errorMessage?: string;
}>();
</script>

<template>
  <div
    v-if="testStatus === 'testing'"
    class="flex items-center gap-2 rounded-md border p-3 text-sm"
  >
    <Icon name="hugeicons:loading-03" class="animate-spin size-5!" />
    <span>Testing connection...</span>
  </div>

  <div
    v-if="testStatus === 'success'"
    class="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-600 dark:border-green-900 dark:bg-green-950/50 dark:text-green-400"
  >
    <Icon name="hugeicons:checkmark-circle-02" class="shrink-0 size-4" />
    <span>Connection successful! Your database is ready to use.</span>
  </div>

  <div
    v-if="testStatus === 'error'"
    class="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
  >
    <Icon name="hugeicons:cancel-01" class="shrink-0 size-4" />
    <span>
      {{
        props.errorMessage ||
        'Connection failed. Please check your details and try again.'
      }}
    </span>
  </div>
</template>
