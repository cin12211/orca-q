<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

defineProps<{
  open: boolean;
  targetConnectionName: string;
  currentConnectionName: string;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <Dialog :open="open" @update:open="!$event && handleCancel()" v-if="open">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Icon name="hugeicons:alert-02" class="size-5 text-amber-500" />
          Confirm query execution
        </DialogTitle>
        <DialogDescription>
          This query will execute on
          <span class="font-medium text-foreground">
            {{ targetConnectionName }}
          </span>
          . The current connection is
          <span class="font-medium text-foreground">
            {{ currentConnectionName }}
          </span>
          . Make sure before executing.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="outline" @click="handleCancel">Cancel</Button>
        <Button class="gap-1" @click="handleConfirm">
          <Icon name="lucide:play" class="size-4" />
          Execute
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
