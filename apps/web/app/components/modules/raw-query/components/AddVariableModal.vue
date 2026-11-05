<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import VariableEditor from './VariableEditor.vue';

defineProps<{
  open: Boolean;
  fileVariables: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'updateVariables', value: string): void;
}>();

const updateFileContent = async (fileContentsValue: string) => {
  emit('updateVariables', fileContentsValue);
};
</script>

<template>
  <Dialog class="" :open="!!open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="w-[60vw] h-[50vh] flex flex-col justify-between min-w-[60vw]"
    >
      <DialogHeader>
        <DialogTitle>
          Add Variable
          <a
            class="underline"
            href="https://www.w3schools.com/js/js_json_syntax.asp"
            target="_blank"
          >
            (JSON format)</a
          >
        </DialogTitle>
      </DialogHeader>

      <div class="h-full flex flex-col overflow-y-auto">
        <VariableEditor
          @updateVariables="updateFileContent"
          :fileVariables="fileVariables"
        />
      </div>

      <DialogFooter class="mt-2">
        <Button @click="emit('update:open', false)"> Save </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
