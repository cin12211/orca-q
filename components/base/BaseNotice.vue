<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'default' | 'secondary' | 'destructive';
  }>(),
  {
    variant: 'default',
  }
);
</script>

<template>
  <div
    class="flex items-start gap-2 rounded-lg border px-3 py-2 text-xxs text-muted-foreground"
    :class="{
      'border-destructive/30 bg-destructive/5': variant === 'destructive',
      'border-muted bg-muted/40': variant === 'secondary',
      'border-primary/30 bg-primary/5': variant === 'default',
    }"
  >
    <Icon name="hugeicons:information-circle" class="mt-0.5 size-4 shrink-0" />
    <span><slot /></span>
  </div>
</template>
