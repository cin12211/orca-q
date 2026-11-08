<script setup lang="ts">
const props = defineProps<{ userName: string; isSaving: boolean }>();

const emit = defineEmits<{ (e: 'confirm'): void }>();

const open = defineModel<boolean>('open', { required: true });

const typedName = ref('');
const canDelete = computed(
  () => typedName.value === props.userName && !props.isSaving
);

watch(open, value => {
  if (value) typedName.value = '';
});
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogContent class="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center gap-2">
          <Icon name="hugeicons:delete-02" class="size-5 text-destructive" />
          Delete user {{ userName }}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          Its permissions and limits are removed too, and clients using it can
          no longer connect. This cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div class="space-y-1.5">
        <Label for="rabbit-delete-user-confirm" class="text-xs">
          Type <span class="font-mono">{{ userName }}</span> to confirm
        </Label>
        <Input
          id="rabbit-delete-user-confirm"
          v-model="typedName"
          autocomplete="off"
          @keydown.enter.prevent="canDelete && emit('confirm')"
        />
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isSaving">Cancel</AlertDialogCancel>
        <Button
          variant="destructive"
          :disabled="!canDelete"
          @click="emit('confirm')"
        >
          <Icon
            v-if="isSaving"
            name="hugeicons:loading-03"
            class="size-4 animate-spin"
          />
          Delete user
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
