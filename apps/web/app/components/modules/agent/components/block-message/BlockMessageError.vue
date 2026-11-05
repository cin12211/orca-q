<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <div class="rounded-xl py-2 text-destructive">
    {{ message }}
  </div>
</template>
