<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>

<template>
  <div class="rounded-xl bg-destructive/10 px-3 py-2 text-destructive">
    {{ message }}
  </div>
</template>
