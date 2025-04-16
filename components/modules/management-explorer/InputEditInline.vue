<template>
  <Input
    type="text"
    :class="[
      'pl-2 w-full h-full! rounded-sm',
      isExitFileNameRef && 'border-destructive! ring-destructive/20!',
    ]"
    @keyup.enter="onEnter"
    @blur="onblur"
    @keydown.stop
    @keyup="handleKeydown"
    v-model="inputValue"
  />
</template>

<script lang="ts" setup>
const props = defineProps<{
  onRename: (name: string) => void;
  onCancelCreate: () => void;
  validateName: (name: string) => boolean;
}>();

const inputValue = ref<string>("");
const isExitFileNameRef = ref(false);

const onHandleRename = (newName: string, isBlur: boolean) => {
  console.log("newName", newName);

  if (!newName) {
    props.onCancelCreate();
  }

  const isExistedFileName = props.validateName(newName);

  console.log("isExistedFileName", isExistedFileName);

  if (isExistedFileName) {
    isBlur && props.onCancelCreate();
  } else {
    props.onRename(newName);
  }
};

const handleKeydown = async (e: FocusEvent) => {
  const name = (e.target as HTMLInputElement).value;

  const isExistedFileName = props.validateName(name);
  isExitFileNameRef.value = isExistedFileName;
};

const onEnter = (e: FocusEvent) => {
  console.log("🚀 ~ onEnter ~ e:", e);
  const name = (e.target as HTMLInputElement).value;
  onHandleRename(name, false);
};

const onblur = (e: FocusEvent) => {
  console.log("🚀 ~ onblur ~ e:", e);

  const name = (e.target as HTMLInputElement).value;
  onHandleRename(name, true);
};

defineExpose({
  inputValue,
});
</script>
