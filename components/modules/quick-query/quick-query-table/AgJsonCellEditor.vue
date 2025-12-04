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

// ==================== ag-Grid ICellEditor required methods ====================
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

// 3. (Tùy chọn) Nếu muốn ngăn không cho thoát editor khi có lỗi validate
function isCancelBeforeStart(): boolean {
  return false;
}

// 4. (Tùy chọn) Cleanup nếu cần
function afterGuiAttached(): void {
  // Có thể focus vào JsonEditorVue ở đây
}
</script>

<template>
  <div
    class="w-[35rem] h-[25rem] bg-background rounded-md p-2 flex flex-col gap-2"
    tabindex="0"
    @keydown.esc="onCancel"
    @keydown.ctrl.enter="onConfirm"
  >
    <div class="flex-1 overflow-hidden">
      <JsonEditorVue
        v-model="localValue"
        :mode="mode as unknown as undefined"
        @modeChange="mode = $event"
        class="h-full rounded-md"
        :style="{ height: '100%' }"
      />
    </div>

    <div class="flex justify-end gap-1">
      <Button @click="onCancel" variant="outline" size="sm"> Cancel </Button>
      <Button @click="onConfirm" size="sm"> Oke </Button>
    </div>
  </div>
</template>

<style lang="css">
@reference "@/assets/css/tailwind.css";

.ag-popup-editor {
  @apply rounded-md shadow;
}

.jse-menu {
  @apply rounded-t-md;
}

.jse-contents {
  @apply rounded-b-md;
}

.jse-button.jse-group-button.jse-first {
  @apply rounded-l-sm!;
}
.jse-button.jse-group-button.jse-last {
  @apply rounded-r-sm!;
}
</style>
