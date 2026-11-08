<script setup lang="ts">
import { computed, toRef } from 'vue';
import ResponseNavigatorDotIndicator from './ResponseNavigatorDotIndicator.vue';
import ResponseNavigatorToast from './ResponseNavigatorToast.vue';
import type { ResponseNavigatorItem, ResponseNavigatorOffset } from './types';
import { useResponseNavigator } from './useResponseNavigator';

const props = withDefaults(
  defineProps<{
    responses: ResponseNavigatorItem[];
    currentIndex: number;
    position?: 'right' | 'left';
    offset?: ResponseNavigatorOffset;
  }>(),
  {
    position: 'right',
    offset: () => ({}),
  }
);

const emit = defineEmits<{
  navigate: [index: number];
}>();

const total = computed(() => props.responses.length);

const containerStyle = computed(() => ({
  top: `calc(50% + ${props.offset.y ?? 0}px)`,
  right: props.position === 'right' ? `${0 + (props.offset.x ?? 0)}px` : 'auto',
  left: props.position === 'left' ? `${0 + (props.offset.x ?? 0)}px` : 'auto',
  transform: 'translateY(-50%)',
}));

const {
  canGoNext,
  canGoPrevious,
  goNext,
  goPrevious,
  handleKeydown,
  toastMessage,
} = useResponseNavigator({
  currentIndex: toRef(props, 'currentIndex'),
  total,
  onNavigate: index => emit('navigate', index),
});
</script>

<template>
  <div
    v-if="responses.length > 0"
    class="absolute z-30 flex flex-col items-center gap-0.5"
    :style="containerStyle"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <ResponseNavigatorToast :message="toastMessage" :position="position" />

    <Tooltip :delay-duration="150">
      <TooltipTrigger as-child>
        <Button
          :size="'iconSm'"
          :variant="'ghost'"
          aria-label="Go to previous response"
          :aria-disabled="!canGoPrevious"
          :disabled="!canGoPrevious"
          @click="goPrevious"
        >
          <Icon name="lucide:chevron-up" />
        </Button>
      </TooltipTrigger>
      <TooltipContent :side="position === 'left' ? 'right' : 'left'">
        <p>Previous response</p>
      </TooltipContent>
    </Tooltip>

    <ResponseNavigatorDotIndicator
      :current-index="currentIndex"
      :responses="responses"
      :position="position"
      @select="emit('navigate', $event)"
    />

    <Tooltip :delay-duration="150">
      <TooltipTrigger as-child>
        <Button
          :size="'iconSm'"
          :variant="'ghost'"
          aria-label="Go to next response"
          :aria-disabled="!canGoNext"
          :disabled="!canGoNext"
          @click="goNext"
        >
          <Icon name="lucide:chevron-down" />
        </Button>
      </TooltipTrigger>
      <TooltipContent :side="position === 'left' ? 'right' : 'left'">
        <p>Next response</p>
      </TooltipContent>
    </Tooltip>
  </div>
</template>
