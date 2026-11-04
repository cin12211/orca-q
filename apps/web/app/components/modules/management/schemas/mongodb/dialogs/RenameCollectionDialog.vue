<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  open: boolean;
  currentName: string;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm', newName: string): void;
  (e: 'cancel'): void;
}>();

const inputValue = ref('');

watch(
  () => props.open,
  isOpen => {
    if (isOpen) inputValue.value = props.currentName;
  }
);

const handleConfirm = () => {
  if (inputValue.value && inputValue.value !== props.currentName) {
    emit('confirm', inputValue.value);
  } else {
    emit('update:open', false);
  }
};

const handleCancel = () => {
  emit('update:open', false);
  emit('cancel');
};
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border w-96!">
      <AlertDialogHeader>
        <AlertDialogTitle>Rename Collection</AlertDialogTitle>
        <AlertDialogDescription>
          Enter a new name for the collection.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div class="py-2">
        <Input
          v-model="inputValue"
          placeholder="New collection name"
          class="w-full"
          :disabled="loading"
          @keyup.enter="handleConfirm"
        />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="loading" @click="handleCancel">
          Cancel
        </AlertDialogCancel>
        <Button :disabled="loading" @click="handleConfirm">
          <Icon
            v-if="loading"
            name="hugeicons:loading-03"
            class="size-4 mr-2 animate-spin"
          />
          Rename
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
