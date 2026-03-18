<script setup lang="ts">
import { ref, onMounted, type Ref } from 'vue';
import { Button } from '#components';
import type { ICellEditorParams } from 'ag-grid-community';
import JsonEditorVue from 'json-editor-vue';

enum JsonEditorMode {
  text = 'text',
  tree = 'tree',
  table = 'table',
}

const props = defineProps<{
  params: ICellEditorParams;
}>();

const localValue: Ref<Record<string, any>> = ref({});

let confirmed = false;

onMounted(() => {
  const value = props.params.value;

  try {
    localValue.value =
      typeof value === 'string' ? JSON.parse(value) : { ...value };
  } catch (e) {
    console.warn('Invalid JSON in cell, starting with empty object');
    localValue.value = {};
  }
});

const onConfirm = () => {
  confirmed = true;
  props.params.stopEditing();
};

// enter esc or cancel
const onCancel = () => {
  confirmed = false;
  props.params.stopEditing();
};

const mode = ref<JsonEditorMode>(JsonEditorMode.text);

function getValue(): any {
  if (confirmed) {
    if (!localValue.value) return null;

    if (typeof localValue.value === 'object') {
      console.log('1');
      return JSON.stringify(localValue.value);
    }

    return localValue.value;
  }
  // return originalValue;
  return props.params.value;
}

function isCancelAfterEnd(): boolean {
  return !confirmed;
}

function isCancelBeforeStart(): boolean {
  return false;
}

function afterGuiAttached(): void {}

defineExpose({
  getValue,
  isCancelAfterEnd,
  isCancelBeforeStart,
  afterGuiAttached,
});
</script>

<template>
  <div
    class="w-[35rem] h-[20rem] bg-background border resize overflow-y-auto rounded-md flex flex-col"
    tabindex="0"
    @keydown.esc="onCancel"
    @keydown.ctrl.enter="onConfirm"
  >
    <div class="flex-1 overflow-hidden">
      <JsonEditorVue
        v-model="localValue"
        class="h-full rounded-md"
        :mode="mode as unknown as undefined"
        :navigationBar="false"
        @modeChange="mode = $event"
      />
    </div>

    <div class="flex justify-end gap-1 p-2">
      <Button @click="onCancel" variant="outline" size="xxs"> Cancel </Button>
      <Button @click="onConfirm" size="xxs"> Oke </Button>
    </div>
  </div>
</template>

<style lang="css">
@reference "@/assets/css/tailwind.css";

.ag-popup-editor {
  @apply rounded-md shadow;
}
</style>
