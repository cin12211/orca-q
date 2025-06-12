<script setup lang="ts">
import { Button } from '@/components/ui/button';

defineProps<{
  isShowButtonCreate: boolean;
}>();

const emit = defineEmits(['create']);
</script>

<template>
  <div class="flex items-center justify-between mt-2">
    <div class="container flex flex-col items-start gap-1 py-2">
      <h1
        class="text-3xl flex items-center gap-2 font-bold leading-tight tracking-tighter lg:leading-[1.1]"
      >
        Hello
        <Icon name="hugeicons:waving-hand-01" />
      </h1>
      <p class="max-w-2xl text-lg font-light text-foreground">
        Welcome to your workspaces
      </p>
    </div>
    <div>
      <Button
        v-if="isShowButtonCreate"
        variant="outline"
        size="lg"
        @click="emit('create')"
      >
        <Icon name="lucide:plus" />

        New Workspace</Button
      >
    </div>
  </div>
</template>
