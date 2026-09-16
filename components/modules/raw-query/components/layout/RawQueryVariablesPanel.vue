<script setup lang="ts">
import { computed, toValue } from 'vue';
import { useRawQueryContext } from '../../hooks';
import VariableEditor from '../VariableEditor.vue';

const context = useRawQueryContext();

const isVariableSupported = computed(
  () => toValue(context?.isVariableSupported) ?? true
);

const fileVariables = computed(() => toValue(context?.fileVariables) ?? '');

const updateFileVariables = async (value: string) => {
  await context?.onUpdateFileVariables?.(value);
};
</script>

<template>
  <div class="flex flex-col h-full border rounded-md bg-muted">
    <div class="flex items-center gap-1 font-normal text-sm px-2 py-1">
      <Icon name="hugeicons:absolute" />
      Variables
    </div>

    <div class="h-full flex flex-col overflow-y-auto">
      <BaseEmpty
        v-if="!isVariableSupported"
        title="Variables not supported"
        desc="Variables are not available for Redis and SQLite connections."
        icon="icons:ghost"
      />

      <VariableEditor
        v-else
        :file-variables="fileVariables"
        @updateVariables="updateFileVariables"
      />
    </div>
  </div>
</template>
