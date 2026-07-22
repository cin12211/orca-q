<script setup lang="ts">
import { ref, watch } from 'vue';
import { Icon } from '#components';

const props = defineProps<{
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  errorMessage?: string;
  errorHint?: string;
  errorDetail?: string;
}>();

const showDetail = ref(false);

// Collapse the raw detail again whenever the status leaves the error state.
watch(
  () => props.testStatus,
  status => {
    if (status !== 'error') showDetail.value = false;
  }
);
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
    data-testid="connection-test-error"
    class="flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
  >
    <div class="flex items-start gap-2">
      <Icon name="hugeicons:cancel-01" class="mt-0.5 shrink-0 size-4" />
      <span data-testid="connection-test-error-message" class="font-medium">
        {{
          props.errorMessage ||
          'Connection failed. Please check your details and try again.'
        }}
      </span>
    </div>

    <p
      v-if="props.errorHint"
      data-testid="connection-test-error-hint"
      class="pl-6 text-red-500 dark:text-red-300/90"
    >
      {{ props.errorHint }}
    </p>

    <div v-if="props.errorDetail" class="pl-6">
      <button
        type="button"
        data-testid="connection-test-error-detail-toggle"
        class="inline-flex items-center gap-1 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
        @click="showDetail = !showDetail"
      >
        <Icon
          :name="
            showDetail ? 'hugeicons:arrow-down-01' : 'hugeicons:arrow-right-01'
          "
          class="size-3"
        />
        {{ showDetail ? 'Hide technical details' : 'Show technical details' }}
      </button>

      <pre
        v-if="showDetail"
        data-testid="connection-test-error-detail"
        class="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-red-100/60 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
        >{{ props.errorDetail }}</pre
      >
    </div>
  </div>
</template>
