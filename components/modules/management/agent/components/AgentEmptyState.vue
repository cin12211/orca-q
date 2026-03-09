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
  <div class="flex h-full min-h-[240px] items-center justify-center px-6 text-center text-muted-foreground">
    <div class="max-w-sm">
      <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background shadow-sm">
        <Icon :name="icon" class="size-7 opacity-70" />
      </div>

      <p class="text-sm font-medium text-foreground">{{ title }}</p>
      <p class="mt-2 text-xs leading-6 text-muted-foreground">
        {{ description }}
      </p>

      <Button
        v-if="actionLabel"
        variant="outline"
        size="sm"
        class="mt-4"
        @click="emit('action')"
      >
        <Icon name="hugeicons:quill-write-02" class="mr-2 size-4" />
        {{ actionLabel }}
      </Button>
    </div>
  </div>
</template>
