<script setup lang="ts">
defineProps<{
  roleName: string;
  isLoading: boolean;
}>();

defineEmits<{
  (e: 'refresh'): void;
}>();
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-1 bg-sidebar">
    <div>
      <p class="font-normal text-sm">{{ roleName }}</p>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <!-- <Button variant="outline" size="xs" :disabled="isLoading || isMutating" @click="onOpenGrantDialog">
        <Icon name="hugeicons:plus-sign" class="size-4 mr-1" />
        Grant Permission
      </Button> -->
      <Button
        variant="outline"
        size="iconSm"
        :disabled="isLoading"
        @click="$emit('refresh')"
      >
        <Icon
          :name="isLoading ? 'hugeicons:loading-03' : 'lucide:refresh-cw'"
          :class="['size-4', isLoading && 'animate-spin']"
        />
      </Button>
    </div>
  </div>
</template>
