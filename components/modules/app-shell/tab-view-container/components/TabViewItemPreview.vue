<template>
  <div
    class="bg-white w-44 max-w-44 text-blackA11 rounded-md flex items-center gap-2 text-sm font-medium h-7 px-3 py-1.5"
  >
    <!-- <Icon :name="icon" class="size-4 min-w-4" /> -->
    {{ name }}
  </div>
</template>
<script lang="ts" setup>
defineProps<{
  icon: string;
  name: string;
}>();
</script>
