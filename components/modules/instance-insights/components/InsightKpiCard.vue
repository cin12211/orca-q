<script setup lang="ts">
import InsightScopeBadge from './InsightScopeBadge.vue';

export interface InsightInfoTooltip {
  systemMemory?: string;
  maxMemory?: string;
  maxMemoryPolicy?: string;
  customText?: string;
}

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    scope?: 'instance' | 'database';
    dbIndex?: number;
    subtext?: string;
    tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    progress?: number;
    icon?: string;
    infoTooltip?: InsightInfoTooltip | string;
    showBadge?: boolean;
  }>(),
  {
    scope: 'instance',
    tone: 'default',
    showBadge: true,
  }
);

const toneClasses = computed(() => {
  switch (props.tone) {
    case 'success':
      return 'text-emerald-500';
    case 'warning':
      return 'text-amber-500';
    case 'danger':
      return 'text-rose-500';
    case 'info':
      return 'text-sky-500';
    default:
      return 'text-foreground';
  }
});

const progressColor = computed(() => {
  if (props.progress === undefined) return 'bg-primary';
  if (props.progress >= 85) return 'bg-rose-500';
  if (props.progress >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
});
</script>

<template>
  <div
    class="rounded-lg border bg-card/60 p-3 shadow-2xs flex flex-col justify-between gap-1.5 transition-all hover:bg-card"
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 min-w-0">
        <span
          class="text-xs font-medium text-muted-foreground truncate"
          :title="label"
        >
          {{ label }}
        </span>
        <Tooltip v-if="infoTooltip">
          <TooltipTrigger as-child>
            <button
              type="button"
              class="text-muted-foreground/70 hover:text-foreground cursor-help inline-flex items-center shrink-0"
            >
              <Icon name="hugeicons:information-circle" class="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" class="text-xs space-y-1 p-2">
            <template v-if="typeof infoTooltip === 'string'">
              <p>{{ infoTooltip }}</p>
            </template>
            <template v-else>
              <p v-if="infoTooltip.systemMemory">
                <span class="text-muted-foreground">System memory:</span>
                <span class="font-mono font-medium ml-1">{{
                  infoTooltip.systemMemory
                }}</span>
              </p>
              <p v-if="infoTooltip.maxMemory">
                <span class="text-muted-foreground">Maxmemory limit:</span>
                <span class="font-mono font-medium ml-1">{{
                  infoTooltip.maxMemory
                }}</span>
              </p>
              <p v-if="infoTooltip.maxMemoryPolicy">
                <span class="text-muted-foreground">Maxmemory policy:</span>
                <span class="font-mono font-medium ml-1">{{
                  infoTooltip.maxMemoryPolicy
                }}</span>
              </p>
              <p v-if="infoTooltip.customText">{{ infoTooltip.customText }}</p>
            </template>
          </TooltipContent>
        </Tooltip>
      </div>
      <InsightScopeBadge v-if="showBadge" :scope="scope" :db-index="dbIndex" />
    </div>

    <!-- Middle: Subtext & Progress bar -->
    <div v-if="subtext || progress !== undefined" class="space-y-1.5 my-0.5">
      <p
        v-if="subtext"
        class="text-[11px] text-muted-foreground truncate"
        :title="subtext"
      >
        {{ subtext }}
      </p>
      <div
        v-if="progress !== undefined"
        class="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden"
      >
        <div
          class="h-full transition-all duration-300 rounded-full"
          :class="progressColor"
          :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
        />
      </div>
    </div>

    <!-- Bottom: Value & Icon -->
    <div class="flex items-baseline justify-between gap-2 mt-auto pt-0.5">
      <span class="text-lg font-medium tracking-tight" :class="toneClasses">
        {{ value }}
      </span>
      <Icon
        v-if="icon"
        :name="icon"
        class="size-4 text-muted-foreground/60 shrink-0"
      />
    </div>
  </div>
</template>
