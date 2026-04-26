<script setup lang="ts">
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import type { Connection } from '~/core/types/entities/connection.entity';
import PureConnectionSelector from '../../../selectors/PureConnectionSelector.vue';

const { workspaceId } = useWorkspaceConnectionRoute();

defineProps<{
  sourceConnection: Connection | null;
  targetConnection: Connection | null;
  connections: Connection[];
  isLoading: boolean;
}>();

const emit = defineEmits<{
  'update:targetConnection': [connection: Connection | null];
  run: [];
}>();
</script>

<template>
  <div
    class="flex flex-col gap-2 rounded-lg border bg-card p-4 sm:flex-row sm:items-end sm:justify-between"
  >
    <!-- Source -->
    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label class="text-xs font-medium text-muted-foreground">Source</Label>

      <PureConnectionSelector
        class="h-9 w-full"
        :workspace-id="workspaceId || ''"
        :connection-id="sourceConnection?.id || ''"
        :connection="sourceConnection || undefined"
        :connections="sourceConnection ? [sourceConnection] : []"
        disabled
      />
    </div>

    <!-- Arrow -->
    <div class="flex h-9 items-center justify-center sm:w-6">
      <Icon
        name="hugeicons:arrow-right-02"
        class="size-4 text-muted-foreground"
      />
    </div>

    <!-- Target -->
    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label class="text-xs font-medium text-muted-foreground">Target</Label>
      <PureConnectionSelector
        class="h-9 w-full"
        :workspace-id="workspaceId || ''"
        :connection-id="targetConnection?.id || ''"
        :connection="targetConnection || undefined"
        :connections="connections"
        @update:connection-id="
          id =>
            emit(
              'update:targetConnection',
              connections.find(c => c.id === id) || null
            )
        "
        skip-strict-mode-connections
      />
    </div>

    <!-- Run button -->
    <Button
      :disabled="!sourceConnection || !targetConnection || isLoading"
      size="sm"
      @click="emit('run')"
    >
      <Icon
        v-if="isLoading"
        name="hugeicons:loading-03"
        class="size-4 animate-spin"
      />
      <Icon v-else name="hugeicons:git-compare" class="size-4" />
      {{ isLoading ? 'Comparing...' : 'Run Diff' }}
    </Button>
  </div>
</template>
