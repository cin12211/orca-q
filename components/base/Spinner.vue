<script setup lang="ts">
import { defineProps, withDefaults } from 'vue';

interface ISVGProps {
  size?: number;
  className?: string;
}

const props = withDefaults(defineProps<ISVGProps>(), {
  size: 24,
  className: '',
});
</script>

<template>
  <div class="relative inline-block">
    <Icon name="lucide:loader" class="animate-spin absolute" />
  </div>
</template>
