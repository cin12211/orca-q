<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  open: boolean;
  databaseName: string;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm', name: string): void;
  (e: 'cancel'): void;
}>();

const inputValue = ref('');

watch(
  () => props.open,
  isOpen => {
    if (isOpen) inputValue.value = '';
  }
);

const handleConfirm = () => {
  if (inputValue.value) {
    emit('confirm', inputValue.value);
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
        <AlertDialogTitle>Create Collection</AlertDialogTitle>
        <AlertDialogDescription>
          Create a new collection in
          <span class="font-semibold text-foreground">{{ databaseName }}</span
          >.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div class="py-2">
        <Input
          v-model="inputValue"
          placeholder="Collection name"
          class="w-full"
          :disabled="loading"
          @keyup.enter="handleConfirm"
        />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="loading" @click="handleCancel">
          Cancel
        </AlertDialogCancel>
        <Button :disabled="loading || !inputValue" @click="handleConfirm">
          <Icon
            v-if="loading"
            name="hugeicons:loading-03"
            class="size-4 mr-2 animate-spin"
          />
          Create
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
