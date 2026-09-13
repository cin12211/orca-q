<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import type { RawQueryFooterContext } from '../registry/rawQueryProfile.types';

const props = defineProps<{
  context: RawQueryFooterContext;
}>();

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
        Execute script
        <ContextMenuShortcut>⌘↵</ContextMenuShortcut>
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p v-if="context.isStreaming || context.executeLoading">Cancel query</p>
      <p v-else>Execute MongoDB script (⌘↵)</p>
    </TooltipContent>
  </Tooltip>
</template>
