<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { maskMcpToken } from '~/core/helpers/mcp-token';

const props = defineProps<{
  token: string;
}>();

const emit = defineEmits<{
  copy: [text: string];
}>();

const isRevealed = ref(false);

const displayedToken = computed(() =>
  isRevealed.value ? props.token : maskMcpToken(props.token)
);
</script>

<template>
  <div class="flex items-center gap-1 min-w-0 rounded-md border px-2 py-0.5">
    <Icon name="hugeicons:key-01" class="size-4! shrink-0" />
    <code class="text-xs flex-1 min-w-0 truncate">{{ displayedToken }}</code>
    <Button
      type="button"
      size="iconSm"
      variant="ghost"
      :title="isRevealed ? 'Hide token' : 'Show token'"
      @click="isRevealed = !isRevealed"
    >
      <Icon
        :name="isRevealed ? 'hugeicons:view-off' : 'hugeicons:view'"
        class="size-4!"
      />
    </Button>
    <Button
      type="button"
      size="iconSm"
      variant="ghost"
      title="Copy token"
      @click="emit('copy', props.token)"
    >
      <Icon name="hugeicons:copy-01" class="size-4!" />
    </Button>
  </div>
</template>
