<script setup lang="ts">
const props = defineProps<{
  title: string;
  description: string;
  confirmLabel: string;
  isSaving: boolean;
  /** When set, the user must type this text before confirming. */
  confirmText?: string;
  isDestructive?: boolean;
}>();

const emit = defineEmits<{ (e: 'confirm'): void }>();

const open = defineModel<boolean>('open', { required: true });

const typedText = ref('');
const canConfirm = computed(
  () =>
    !props.isSaving &&
    (!props.confirmText || typedText.value === props.confirmText)
);

watch(open, value => {
  if (value) typedText.value = '';
});
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent class="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ description }}</AlertDialogDescription>
      </AlertDialogHeader>

      <slot />

      <div v-if="confirmText" class="space-y-1.5">
        <Label for="rabbit-confirm-text" class="text-xs">
          Type <span class="font-mono">{{ confirmText }}</span> to confirm
        </Label>
        <Input
          id="rabbit-confirm-text"
          v-model="typedText"
          autocomplete="off"
          @keydown.enter.prevent="canConfirm && emit('confirm')"
        />
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isSaving">Cancel</AlertDialogCancel>
        <Button
          :variant="isDestructive ? 'destructive' : 'default'"
          :disabled="!canConfirm"
          @click="emit('confirm')"
        >
          <Icon
            v-if="isSaving"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          {{ confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
