<script setup lang="ts">
import { ref } from 'vue';
import { Button, Icon } from '#components';

const emit = defineEmits<{
  (e: 'onRefresh'): void;
}>();

// Reactive state for rotation angle
const rotation = ref(0);

const handleRefreshClick = () => {
  rotation.value += 360; // Increment by 360 degrees for each click
  emit('onRefresh');
};
</script>

<template>
  <Button
    variant="outline"
    size="iconSm"
    class="h-6"
    @click="handleRefreshClick"
    aria-label="Refresh table"
  >
    <Icon
      name="hugeicons:refresh"
      :style="{ transform: `rotate(${rotation}deg)` }"
      class="icon-transition"
    />
  </Button>
</template>

<style scoped>
.icon-transition {
  transition: transform 0.4s ease-in;
}
</style>
