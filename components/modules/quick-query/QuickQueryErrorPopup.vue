<script setup lang="ts">
defineProps<{
  open: Boolean;
  message: string;
}>();

defineEmits(['update:open']);
</script>

<template>
  <Dialog :open="!!open" @update:open="$emit('update:open', $event)">
    <DialogContent class="w-[30vw] min-w-96">
      <DialogHeader class="pb-0">
        <DialogTitle>Query error!</DialogTitle>
      </DialogHeader>

      <DialogDescription
        class="decoration-wavy underline decoration-red-600 overflow-auto max-h-[30vh]"
      >
        {{ message }}
      </DialogDescription>

      <DialogFooter class="pt-0">
        <Button @click="$emit('update:open', false)" class="w-full">
          Oke
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
