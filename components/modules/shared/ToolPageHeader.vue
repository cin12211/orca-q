<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string;
    title: string;
    description?: string;
  }>(),
  {
    description: '',
  }
);
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-lg border bg-background p-3 lg:flex-row lg:items-start lg:justify-between"
  >
    <div class="min-w-0 space-y-1">
      <div class="flex items-center gap-2">
        <Icon :name="icon" class="size-5 text-primary" />
        <h2 class="text-base font-medium">{{ title }}</h2>
      </div>

      <p v-if="description" class="text-sm text-muted-foreground">
        {{ description }}
      </p>

      <div
        v-if="$slots.context"
        class="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
      >
        <slot name="context" />
      </div>

      <div
        v-if="$slots.badges"
        class="mt-0.5 flex flex-wrap items-center gap-1.5"
      >
        <slot name="badges" />
      </div>
    </div>

    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
