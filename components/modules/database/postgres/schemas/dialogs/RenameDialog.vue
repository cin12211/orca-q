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
import { TabViewType } from '~/core/stores';

interface Props {
  open: boolean;
  tabViewType: TabViewType | null;
  currentName?: string;
}

const props = defineProps<Props>();
const open = defineModel<boolean>('open', { required: true });

const emit = defineEmits<{
  (e: 'confirm', newName: string): void;
  (e: 'cancel'): void;
}>();

const inputValue = ref('');

watch(open, isOpen => {
  if (isOpen) {
    inputValue.value = props.currentName || '';
  }
});

const handleConfirm = () => {
  if (inputValue.value && inputValue.value !== props.currentName) {
    emit('confirm', inputValue.value);
  } else {
    open.value = false;
  }
};

const handleCancel = () => {
  open.value = false;
  emit('cancel');
};
</script>

<template>
  <AlertDialog v-model:open="open">
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
