<script setup lang="ts">
import { resolveCommandResultHandler } from '~/components/modules/driver/shared/raw-query';
import type { RawQueryDriverDescriptor } from '~/components/modules/raw-query/contracts';
import { sqlStreamingExecutor } from '~/components/modules/raw-query/services';
import { RawQueryShell } from '~/components/modules/raw-query/shell';

defineProps<{
  descriptor: RawQueryDriverDescriptor;
}>();
</script>

<template>
  <RawQueryShell
    :descriptor="descriptor"
    :executor="sqlStreamingExecutor"
    :resolve-command-result-handler="resolveCommandResultHandler"
  />
</template>
