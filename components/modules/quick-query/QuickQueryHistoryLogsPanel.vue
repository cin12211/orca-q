<template>
  <Card class="py-2 border-t-0 h-full rounded-t-none! rounded-md">
    <CardContent :class="['p-0 overflow-y-auto']">
      <ScrollArea class="h-full" @scroll="handleScroll">
        <div class="px-2 font-mono text-sm">
          <div
            v-if="logs.length === 0"
            class="flex h-full items-center justify-center text-zinc-500"
          >
            No logs to display
          </div>
          <template v-else>
            <div
              v-for="(log, index) in logs"
              :key="index"
              class="mb-2.5 leading-relaxed text-xs"
            >
              <span class="text-emerald-400"
                >[{{ formatDate(log.createdAt) }}]</span
              >
              <span class="whitespace-pre-wrap"> {{ log.logs }}</span>
            </div>
          </template>
          <div ref="scrollRef"></div>
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
// TODO: refactor , and add TanStack Virtual scroll for optimize
interface Log {
  createdAt: string;
  logs: string;
}

const props = defineProps<{
  logs: Log[];
  height?: string;
}>();

const scrollRef = ref<HTMLDivElement | null>(null);
const autoScroll = ref(true);

// Format date to readable time
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Handle scroll to detect if user has scrolled up
const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  const { scrollHeight, scrollTop, clientHeight } = target;

  // If user scrolls up, disable auto-scroll
  // If user scrolls to bottom, enable auto-scroll

  autoScroll.value = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
};

// Scroll to bottom when logs update if autoScroll is enabled
watch(
  () => props.logs,
  () => {
    if (autoScroll.value && scrollRef.value) {
      nextTick(() => {
        scrollRef.value?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  },
  { deep: true }
);

// Scroll to bottom on initial mount
onMounted(() => {
  if (scrollRef.value) {
    scrollRef.value.scrollIntoView({ behavior: 'auto' });
  }
});
</script>
