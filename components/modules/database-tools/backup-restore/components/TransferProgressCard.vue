<script setup lang="ts">
interface Props {
  tool: string;
  stage: string;
  statusMessage: string;
  progress: number;
  isRunning: boolean;
  /** Tailwind bg class for the progress bar. Defaults to bg-primary. */
  progressClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  progressClass: 'bg-primary',
});
</script>

<template>
  <div class="rounded-lg border bg-muted/30 p-4">
    <div class="flex items-center justify-between gap-4">
      <div>
        <p class="text-sm font-medium">{{ tool }} · {{ stage }}</p>
        <p class="text-xs text-muted-foreground">
          {{ statusMessage || 'Preparing job...' }}
        </p>
      </div>
      <span class="text-sm font-medium">{{ progress }}%</span>
    </div>

    <div class="mt-3 h-2 overflow-hidden rounded-full bg-border/60">
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="progressClass"
        :style="{ width: `${Math.max(progress, isRunning ? 8 : 0)}%` }"
      />
    </div>
  </div>
</template>
