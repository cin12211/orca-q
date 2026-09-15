<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import ContextMenuShortcut from '~/components/ui/context-menu/ContextMenuShortcut.vue';
import type { RawQueryContext } from '../../registry/rawQueryProfile.types';

const props = defineProps<{
  context: RawQueryContext;
}>();

const onFormatScript = () => {
  if (props.context.onFormatCurrentStatement) {
    props.context.onFormatCurrentStatement();
  } else {
    props.context.rawQueryEditor?.onHandleFormatCurrentStatement?.();
  }
};
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button @click="onFormatScript" variant="outline" size="xxs">
        <Icon name="hugeicons:magic-wand-01" />
        Format script
        <ContextMenuShortcut>⌘S</ContextMenuShortcut>
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Format MongoDB script (⌘S)</p>
    </TooltipContent>
  </Tooltip>
</template>
