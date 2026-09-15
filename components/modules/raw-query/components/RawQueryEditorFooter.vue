<script setup lang="ts">
import { computed, toValue, type Component } from 'vue';
import { useRawQueryContext } from '../hooks';
import { getRawQueryProfile } from '../registry';

const props = defineProps<{
  customLeftComponents?: Component[];
  customRightComponents?: Component[];
}>();

const context = useRawQueryContext();

const databaseType = computed(() => toValue(context?.databaseType));
const rawQueryProfile = computed(() => getRawQueryProfile(databaseType.value));
const footerProfile = computed(() => rawQueryProfile.value.footer);

const leftComponents = computed<Component[]>(() => [
  ...(footerProfile.value.leftComponents ?? []),
  ...(props.customLeftComponents ?? []),
]);

const rightComponents = computed<Component[]>(() => [
  ...(footerProfile.value.rightComponents ?? []),
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
