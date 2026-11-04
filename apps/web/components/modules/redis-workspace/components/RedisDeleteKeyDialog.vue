<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean;
    mode: 'key' | 'group';
    targetKey?: string;
    targetKeys?: string[];
    loading?: boolean;
    previewLoading?: boolean;
  }>(),
  {
    targetKey: '',
    targetKeys: () => [],
    loading: false,
    previewLoading: false,
  }
);

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm', selectedKeys: string[]): void;
}>();

// Tracks which keys the user has left checked for deletion. Defaults to
// "everything checked" and resets whenever a new key list arrives (e.g. a
// different group's preview finishes loading).
const checkedKeys = ref<Set<string>>(new Set(props.targetKeys));

watch(
  () => props.targetKeys,
  keys => {
    checkedKeys.value = new Set(keys);
  }
);

const isKeySelected = (key: string) => checkedKeys.value.has(key);

const toggleKey = (key: string, checked: boolean | 'indeterminate') => {
  const next = new Set(checkedKeys.value);

  if (checked === true) {
    next.add(key);
  } else {
    next.delete(key);
  }

  checkedKeys.value = next;
};

const isAllSelected = computed(
  () =>
    props.targetKeys.length > 0 &&
    checkedKeys.value.size === props.targetKeys.length
);
const isNoneSelected = computed(() => checkedKeys.value.size === 0);

const selectAllState = computed<boolean | 'indeterminate'>(() => {
  if (isAllSelected.value) {
    return true;
  }

  return isNoneSelected.value ? false : 'indeterminate';
});

const toggleSelectAll = (checked: boolean | 'indeterminate') => {
  checkedKeys.value = checked === true ? new Set(props.targetKeys) : new Set();
};

const selectedKeys = computed(() =>
  props.targetKeys.filter(key => checkedKeys.value.has(key))
);

const isConfirmDisabled = computed(
  () =>
    props.loading ||
    props.previewLoading ||
    (props.mode === 'group' && selectedKeys.value.length === 0)
);

const handleConfirm = () => {
  emit('confirm', selectedKeys.value);
};
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent size="lg" scroll="viewport" class="border">
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ mode === 'key' ? 'Delete key' : 'Delete keys' }}
        </AlertDialogTitle>
        <AlertDialogDescription as-child>
          <div class="space-y-2">
            <p v-if="mode === 'key'" class="break-all">
              This will permanently delete
              <span class="font-mono font-medium">{{ targetKey }}</span>
              . This cannot be undone.
            </p>
            <template v-else>
              <p v-if="previewLoading" class="flex items-center gap-2">
                <Icon name="hugeicons:loading-03" class="size-4 animate-spin" />
                Counting keys that match this group...
              </p>
              <p v-else>
                This will permanently delete
                <span class="font-medium">{{ selectedKeys.length }}</span>
                of
                <span class="font-medium">{{ targetKeys.length }}</span>
                keys. This cannot be undone.
              </p>

              <template v-if="!previewLoading">
                <label
                  v-if="targetKeys.length > 0"
                  class="flex cursor-pointer items-center gap-2 pb-2 text-xs font-medium select-none"
                >
                  <Checkbox
                    :model-value="selectAllState"
                    @update:model-value="toggleSelectAll"
                  />
                  {{ isAllSelected ? 'Deselect all' : 'Select all' }}
                </label>

                <ul
                  class="max-h-72 space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-3 font-mono text-xs"
                >
                  <li v-for="key in targetKeys" :key="key">
                    <label
                      class="flex cursor-pointer items-center gap-2 select-none"
                    >
                      <Checkbox
                        :model-value="isKeySelected(key)"
                        @update:model-value="checked => toggleKey(key, checked)"
                      />
                      <span class="break-all">{{ key }}</span>
                    </label>
                  </li>
                </ul>
              </template>
              <div
                v-else
                class="flex h-40 items-center relative justify-center rounded-md border bg-muted/20 text-xs text-muted-foreground"
              >
                <LoadingOverlay visible />
                Loading matching keys...
              </div>
            </template>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel class="border" :disabled="loading">
          Cancel
        </AlertDialogCancel>
        <!--
          Intentionally a plain Button, not AlertDialogAction: reka-ui
          implements AlertDialogAction as DialogClose, so clicking it closes
          the dialog immediately and synchronously regardless of any @click
          handler — which silently discarded the delete-in-flight state here.
          This button stays fully under our own open/close control instead.
        -->
        <Button
          variant="destructive"
          :disabled="isConfirmDisabled"
          @click="handleConfirm"
        >
          <Icon
            v-if="loading"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          {{ loading ? 'Deleting...' : 'Delete' }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
