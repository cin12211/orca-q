<script setup lang="ts">
defineProps<{
  open: boolean;
  command: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="border">
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm Redis command</AlertDialogTitle>
        <AlertDialogDescription class="space-y-2">
          <p>
            This Redis command looks destructive and can modify or remove data
            immediately.
          </p>
          <pre
            class="rounded-md border bg-muted/20 p-3 text-xs"
          ><code>{{ command }}</code></pre>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel class="border">Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-white hover:bg-destructive/90"
          :disabled="loading"
          @click="emit('confirm')"
        >
          Run Command
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
