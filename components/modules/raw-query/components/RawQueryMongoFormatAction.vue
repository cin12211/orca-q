<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '#components';
import type { RawQueryFooterContext } from '../registry/rawQueryProfile.types';

const props = defineProps<{
  context: RawQueryFooterContext;
}>();

const onFormatScript = () => {
  props.context.onFormatCurrentStatement?.();
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
