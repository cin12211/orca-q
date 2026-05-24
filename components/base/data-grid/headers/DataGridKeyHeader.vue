<script setup lang="ts">
import { Icon } from '#components';

interface Params {
  displayName: string;
  isForeignKey: boolean;
  isPrimaryKey: boolean;
}

const props = defineProps<{
  params: Params;
}>();
</script>

<template>
  <div class="flex gap-0.5 items-center">
    <Icon
      v-if="!!props.params.isPrimaryKey"
      name="lucide:key-round"
      class="min-w-3! text-yellow-500"
    >
    </Icon>

    <Icon
      v-if="!!props.params.isForeignKey"
      name="lucide:key-round"
      class="min-w-3!"
    ></Icon>

    <span class="overflow-hidden text-ellipsis">{{ params.displayName }}</span>
  </div>
</template>
