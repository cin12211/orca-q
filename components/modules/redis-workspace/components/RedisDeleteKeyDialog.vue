<script setup lang="ts">
withDefaults(
  defineProps<{
    open: boolean;
    mode: 'key' | 'group';
    targetKey?: string;
    targetKeys?: string[];
    loading?: boolean;
  }>(),
  {
    targetKey: '',
    targetKeys: () => [],
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border">
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ mode === 'key' ? 'Delete key' : 'Delete keys' }}
        </AlertDialogTitle>
        <AlertDialogDescription class="space-y-2">
          <p v-if="mode === 'key'">
            This will permanently delete
            <span class="font-mono font-medium">{{ targetKey }}</span>
            . This cannot be undone.
          </p>
          <template v-else>
            <p>
              This will permanently delete
              <span class="font-medium">{{ targetKeys.length }}</span>
              keys. This cannot be undone.
            </p>
            <ul
              class="max-h-48 overflow-y-auto rounded-md border bg-muted/20 p-3 font-mono text-xs"
            >
              <li v-for="key in targetKeys" :key="key" class="truncate">
                {{ key }}
              </li>
            </ul>
          </template>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel class="border">Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-white hover:bg-destructive/90"
          :disabled="loading"
          @click="emit('confirm')"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
