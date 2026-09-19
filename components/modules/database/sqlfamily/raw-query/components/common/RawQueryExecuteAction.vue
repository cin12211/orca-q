<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import type { RawQueryFooterContext } from '~/components/modules/database/sqlfamily/raw-query/registry/rawQueryProfile.types';

const props = withDefaults(
  defineProps<{
    context: RawQueryFooterContext;
    label?: string;
    tooltip?: string;
  }>(),
  {
    label: 'Execute current',
    tooltip: 'Execute Query (⌘↵)',
  }
);

const onExecute = () => {
  props.context.onExecuteCurrent?.();
};

const onCancel = () => {
  props.context.onCancelQuery?.();
};
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        v-if="context.isStreaming || context.executeLoading"
        @click="onCancel"
        variant="outline"
        size="xxs"
      >
        <Icon name="hugeicons:stop" class="size-4! text-red-500" />
        Cancel query
      </Button>
      <Button v-else @click="onExecute" variant="outline" size="xxs">
        <Icon name="hugeicons:play" />
        {{ label }}
        <ContextMenuShortcut>⌘↵</ContextMenuShortcut>
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p v-if="context.isStreaming || context.executeLoading">Cancel query</p>
      <p v-else>{{ tooltip }}</p>
    </TooltipContent>
  </Tooltip>
</template>
