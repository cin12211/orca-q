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
  (e: 'confirm'): void;
}>();

const isConfirmDisabled = computed(() => props.loading || props.previewLoading);
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
                <span class="font-medium">{{ targetKeys.length }}</span>
                keys. This cannot be undone.
              </p>
              <ul
                v-if="!previewLoading"
                class="max-h-72 overflow-y-auto rounded-md border bg-muted/20 p-3 font-mono text-xs"
              >
                <li v-for="key in targetKeys" :key="key" class="break-all">
                  {{ key }}
                </li>
              </ul>
              <div
                v-else
                class="flex h-20 items-center justify-center rounded-md border bg-muted/20 text-xs text-muted-foreground"
              >
                Loading matching keys...
              </div>
            </template>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel class="border">Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-white hover:bg-destructive/90"
          :disabled="isConfirmDisabled"
          @click="emit('confirm')"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
