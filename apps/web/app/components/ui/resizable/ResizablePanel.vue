<script setup lang="ts">
import type { SplitterPanelEmits, SplitterPanelProps } from 'reka-ui';
import { SplitterPanel, useForwardPropsEmits } from 'reka-ui';

const props = defineProps<SplitterPanelProps>();
const emits = defineEmits<SplitterPanelEmits>();

const panelRef = ref<InstanceType<typeof SplitterPanel>>();

const forwarded = useForwardPropsEmits(props, emits);

defineExpose(panelRef);
</script>

<template>
  <SplitterPanel data-slot="resizable-panel" v-bind="forwarded" ref="panelRef">
    <slot />
  </SplitterPanel>
</template>
