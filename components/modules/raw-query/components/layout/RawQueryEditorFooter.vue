<script setup lang="ts">
import { computed, toValue, type Component } from 'vue';
import { useRawQueryContext } from '../../hooks';
import { getRawQueryPlugin } from '../../registry';

const props = defineProps<{
  customLeftComponents?: Component[];
  customRightComponents?: Component[];
}>();

const context = useRawQueryContext();

const databaseType = computed(() => toValue(context?.databaseType));
const rawQueryPlugin = computed(() => getRawQueryPlugin(databaseType.value));
const footerConfig = computed(() => rawQueryPlugin.value?.footer);

const leftComponents = computed<Component[]>(() => [
  ...(footerConfig.value?.leftComponents ?? []),
  ...(props.customLeftComponents ?? []),
]);

const rightComponents = computed<Component[]>(() => [
  ...(footerConfig.value?.rightComponents ?? []),
  ...(props.customRightComponents ?? []),
]);
</script>

<template>
  <div class="h-fit py-1 flex items-center justify-between px-2">
    <!-- Left Zone: Pure dynamic registration -->
    <div class="flex items-center gap-2">
      <component
        v-for="(comp, index) in leftComponents"
        :key="index"
        :is="comp"
        :context="context"
      />
      <slot name="left" :context="context" />
    </div>

    <!-- Right Zone: Pure dynamic registration -->
    <div class="flex gap-1 items-center">
      <slot name="before-actions" :context="context" />
      <component
        v-for="(comp, index) in rightComponents"
        :key="index"
        :is="comp"
        :context="context"
      />
      <slot name="right" :context="context" />
    </div>
  </div>
</template>
