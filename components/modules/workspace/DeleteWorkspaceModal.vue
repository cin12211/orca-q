<script setup lang="ts">
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

defineProps<{
  open: Boolean;
  onConfirm?: () => void;
}>();

const emit = defineEmits(['update:open']);
</script>

<template>
  <Dialog :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete workspace</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this workspace?
          <br />
          All data will be permanently deleted this action cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button type="submit" @click="onConfirm" variant="destructive">
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
