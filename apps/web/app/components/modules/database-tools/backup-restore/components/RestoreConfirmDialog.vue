<script setup lang="ts">
const CONFIRM_PHRASE = 'restore backup';

const props = defineProps<{ open: boolean }>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const inputValue = ref('');

watch(
  () => props.open,
  open => {
    if (open) inputValue.value = '';
  }
);

const isConfirmEnabled = computed(() => inputValue.value === CONFIRM_PHRASE);

const handleConfirm = () => {
  if (isConfirmEnabled.value) emit('confirm');
};
</script>

<template>
  <Dialog :open="open" @update:open="!$event && $emit('cancel')">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-destructive">
          <Icon name="hugeicons:alert-02" class="size-5" />
          Confirm Restore
        </DialogTitle>
        <DialogDescription>
          This will overwrite existing data in the target database. This action
          cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3 py-1">
        <Label for="restore-confirm-input">
          Type
          <code class="rounded bg-muted px-1 py-0.5 text-xs font-mono">{{
            CONFIRM_PHRASE
          }}</code>
          to continue:
        </Label>
        <Input
          id="restore-confirm-input"
          v-model="inputValue"
          :placeholder="CONFIRM_PHRASE"
          autocomplete="off"
          @keydown.enter="handleConfirm"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" @click="$emit('cancel')">Cancel</Button>
        <Button
          variant="destructive"
          :disabled="!isConfirmEnabled"
          @click="handleConfirm"
        >
          Restore
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
