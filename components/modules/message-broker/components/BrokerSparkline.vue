<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    values: number[];
    label: string;
    height?: number;
  }>(),
  { height: 36 }
);

const WIDTH = 160;
/** Headroom above the highest sample so a flat series reads as a line, not a block. */
const HEADROOM = 1.25;

const points = computed(() => {
  if (props.values.length < 2) return [];

  const max = Math.max(...props.values, 1) * HEADROOM;
  const step = WIDTH / (props.values.length - 1);

  return props.values.map((value, index) => ({
    x: index * step,
    y: props.height - (value / max) * (props.height - 4) - 2,
  }));
});

const linePath = computed(() =>
  points.value
    .map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`)
    .join(' ')
);
const areaPath = computed(() =>
  points.value.length
    ? `${linePath.value} L${WIDTH},${props.height} L0,${props.height} Z`
    : ''
);
const latest = computed(() => props.values[props.values.length - 1] ?? 0);
</script>

<template>
  <div class="rounded-lg border bg-background p-2.5 space-y-1 min-w-0">
    <div class="flex items-center justify-between text-xs">
      <span class="text-muted-foreground">{{ label }}</span>
      <span class="font-medium tabular-nums">{{ latest.toFixed(1) }}</span>
    </div>
    <svg
      v-if="points.length"
      :viewBox="`0 0 ${WIDTH} ${height}`"
      preserveAspectRatio="none"
      class="w-full text-primary"
      :style="{ height: `${height}px` }"
      role="img"
      :aria-label="`${label} over the last 10 minutes`"
    >
      <path :d="areaPath" fill="currentColor" fill-opacity="0.12" />
      <path
        :d="linePath"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      />
    </svg>
    <p
      v-else
      class="text-xxs text-muted-foreground"
      :style="{ height: `${height}px` }"
    >
      No samples yet
    </p>
  </div>
</template>
