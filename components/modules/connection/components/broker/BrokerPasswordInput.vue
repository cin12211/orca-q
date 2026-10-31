<script setup lang="ts">
import { Icon } from '#components';
import { Input } from '@/components/ui/input';

defineProps<{ id: string }>();

const model = defineModel<string>({ required: true });
const isVisible = ref(false);
</script>

<template>
  <div class="relative">
    <Input
      :id="id"
      v-model="model"
      :type="isVisible ? 'text' : 'password'"
      placeholder="••••••••"
      class="pr-8"
    />
    <button
      type="button"
      class="absolute right-2 top-1/2 h-5 cursor-pointer -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      :aria-label="isVisible ? 'Hide password' : 'Show password'"
      @click="isVisible = !isVisible"
    >
      <Icon
        :name="isVisible ? 'hugeicons:view' : 'hugeicons:view-off'"
        class="size-4!"
      />
    </button>
  </div>
</template>
