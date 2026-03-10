<script setup lang="ts">
withDefaults(
  defineProps<{
    actionLabel?: string;
    description: string;
    icon?: string;
    title: string;
  }>(),
  {
    actionLabel: undefined,
    icon: 'hugeicons:chatting-01',
  }
);

const emit = defineEmits<{
  (e: 'action'): void;
}>();
</script>

<template>
  <div
    class="flex h-full min-h-[240px] items-center justify-center px-6 text-center text-muted-foreground"
  >
    <div class="max-w-sm">
      <p class="text-sm font-medium text-foreground">{{ title }}</p>
      <p class="text-xs text-muted-foreground">
        {{ description }}
      </p>

      <Button
        v-if="actionLabel"
        variant="outline"
        size="sm"
        class="mt-4"
        @click="emit('action')"
      >
        <Icon name="hugeicons:plus-sign" class="size-4" />
        {{ actionLabel }}
      </Button>
    </div>
  </div>
</template>
