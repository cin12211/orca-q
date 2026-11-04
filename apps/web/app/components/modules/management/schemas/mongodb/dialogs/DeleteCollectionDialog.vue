<script setup lang="ts">
interface Props {
  open: boolean;
  collectionName: string;
  loading?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center gap-2">
          <Icon name="lucide:trash-2" class="size-5 text-destructive" />
          Delete Collection
        </AlertDialogTitle>
        <AlertDialogDescription class="space-y-4">
          <div class="text-sm">
            Are you sure you want to delete the collection
            <span class="font-semibold text-foreground">{{
              collectionName
            }}</span>
            ? All documents in it will be permanently removed.
          </div>
          <div class="text-xs text-muted-foreground">
            This action cannot be undone.
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="loading" @click="emit('cancel')">
          Cancel
        </AlertDialogCancel>
        <Button
          variant="destructive"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <Icon
            v-if="loading"
            name="hugeicons:loading-03"
            class="size-4 mr-2 animate-spin"
          />
          Delete
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
