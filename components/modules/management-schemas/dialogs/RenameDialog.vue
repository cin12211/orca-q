<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { TabViewType } from '~/shared/stores';

interface Props {
  open: boolean;
  tabViewType: TabViewType | null;
  currentName?: string;
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
    if (isOpen) {
      inputValue.value = props.currentName || '';
    }
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
        <AlertDialogTitle>
          Rename
          {{
            tabViewType === TabViewType.FunctionsDetail ? 'Function' : 'Table'
          }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          Enter a new name for the
          {{
            tabViewType === TabViewType.FunctionsDetail ? 'function' : 'table'
          }}.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div class="py-2">
        <Input
          v-model="inputValue"
          :placeholder="`New ${tabViewType === TabViewType.FunctionsDetail ? 'function' : 'table'} name`"
          class="w-full"
          @keyup.enter="handleConfirm"
        />
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancel"> Cancel </AlertDialogCancel>
        <AlertDialogAction @click="handleConfirm"> Rename </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
