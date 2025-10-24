<template>
  <Input
    type="text"
    class="pl-2 w-full h-full! rounded-sm"
    :class="isDuplicateName && 'border-destructive! ring-destructive/20!'"
    v-model="inputValue"
    @keyup.enter="handleEnter"
    @blur.stop="handleBlur"
    @keydown.stop
    @keyup.stop
  />
</template>

<script lang="ts" setup>
const emit = defineEmits<{
  (e: 'onRename', name: string): void;
  (e: 'onCancelEdit'): void;
  (e: 'onDeleteFile'): void;
}>();

const props = defineProps<{
  validateName: (name: string) => boolean;
}>();

const inputValue = ref('');
const isDuplicateName = ref(false);

// validate each time input changes
watch(inputValue, val => {
  isDuplicateName.value = props.validateName(val);
});

const handleRename = (name: string) => {
  if (!name) {
    emit('onCancelEdit');
    return;
  }

  if (!props.validateName(name)) {
    emit('onRename', name);
    return;
  }
};

const handleEnter = (e: KeyboardEvent) => {
  const name = (e.target as HTMLInputElement).value.trim();
  handleRename(name);
};

const handleBlur = (e: FocusEvent) => {
  const input = e.target as HTMLInputElement;
  const name = input.value;

  if (!name) {
    emit('onDeleteFile');
    return;
  }

  if (props.validateName(name)) {
    emit('onCancelEdit');
  } else {
    handleRename(name);
  }
};

defineExpose({ inputValue });
</script>
