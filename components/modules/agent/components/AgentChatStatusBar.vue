<script setup lang="ts">
const props = defineProps<{
  modelLabel: string;
  isLoading: boolean;
  showReasoning: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:showReasoning', value: boolean): void;
}>();
</script>

<template>
  <div
    class="flex items-center justify-between px-4 mt-2 text-[12px] text-muted-foreground relative z-30"
  >
    <div class="flex items-center gap-6">
      <div class="flex items-center gap-1.5">
        <Icon name="hugeicons:ai-brain-05" class="size-3.5 stroke-[1.5]" />
        <span>Reasoning</span>
        <Switch
          :model-value="showReasoning"
          aria-label="Toggle reasoning"
          @update:model-value="emit('update:showReasoning', !!$event)"
        />
      </div>

      <div class="flex items-center gap-1.5">
        <Icon name="hugeicons:robotic" class="size-3.5 stroke-[1.5]" />
        <span>{{ modelLabel }}</span>
      </div>
    </div>

    <div class="flex items-center gap-1.5">
      <Icon
        :name="isLoading ? 'lucide:loader-circle' : 'lucide:circle-check-big'"
        :class="['size-3.5 stroke-[1.5]', isLoading ? 'animate-spin' : '']"
      />
      <span>{{ isLoading ? 'Streaming' : 'Ready' }}</span>
    </div>
  </div>
</template>
