<script setup lang="ts">
import type { DatabaseRole } from '~/core/types';

interface Props {
  open: boolean;
  role: DatabaseRole | null;
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const generatedSQL = computed(() => {
  if (!props.role) return '';
  return `DROP ROLE IF EXISTS "${props.role.roleName}"`;
});
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center gap-2">
          <Icon name="lucide:trash-2" class="size-5 text-destructive" />
          Delete User/Role
        </AlertDialogTitle>
        <AlertDialogDescription v-if="role" class="space-y-4">
          <div class="text-sm">
            Are you sure you want to delete the role
            <span class="font-semibold text-foreground">{{
              role.roleName
            }}</span
            >?
          </div>

          <!-- Warning for superusers -->
          <div
            v-if="role.isSuperuser"
            class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20"
          >
            <Icon
              name="lucide:alert-triangle"
              class="size-5 text-destructive shrink-0 mt-0.5"
            />
            <div class="text-sm text-destructive">
              <span class="font-semibold">Warning:</span> This is a superuser
              role. Deleting it may affect system functionality.
            </div>
          </div>

          <!-- SQL Preview -->
          <div class="space-y-2">
            <p class="text-xs font-medium text-muted-foreground">
              Generated SQL:
            </p>
            <div class="p-3 bg-muted/50 rounded-md border font-mono text-xs">
              {{ generatedSQL }}
            </div>
          </div>

          <div class="text-xs text-muted-foreground">
            This action cannot be undone. Objects owned by this role must be
            reassigned or dropped first.
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel @click="emit('cancel')" :disabled="loading">
          Cancel
        </AlertDialogCancel>
        <Button
          variant="destructive"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <Icon
            v-if="loading"
            name="lucide:loader-2"
            class="size-4 mr-2 animate-spin"
          />
          Delete Role
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
