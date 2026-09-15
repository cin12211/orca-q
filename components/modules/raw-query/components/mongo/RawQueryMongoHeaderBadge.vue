<script setup lang="ts">
import { computed } from 'vue';
import { Badge } from '#components';
import type { MongoDialectState, RawQueryContext } from '../../registry';

const props = defineProps<{
  context?: RawQueryContext<MongoDialectState>;
}>();

const activeState = computed(() => props.context?.dialectState);

const badgeText = computed(
  () => activeState.value?.badgeText?.value ?? 'MongoDB Beta'
);

const clickCount = computed(() => activeState.value?.clickCount?.value ?? 0);

const handleBadgeClick = () => {
  activeState.value?.incrementCount();
};
</script>

<template>
  <Badge
    variant="secondary"
    class="cursor-pointer select-none text-xxs transition-colors hover:bg-secondary/80"
    title="Click to mutate dialect reactive state"
    @click="handleBadgeClick"
  >
    {{ badgeText }} (clicks: {{ clickCount }})
  </Badge>
</template>
