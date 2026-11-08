<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useEnvironmentTagStore } from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';
import CreateEnvTagDialog from '../components/CreateEnvTagDialog.vue';
import EnvTagBadge from '../components/EnvTagBadge.vue';

const store = useEnvironmentTagStore();
const connectionStore = useManagementConnectionStore();
const isCreateTagDialogOpen = ref(false);
const editingTag = ref<
  import('../types/environmentTag.types').EnvironmentTag | null
>(null);
const deleteTagId = ref<string | null>(null);
const isDeleting = ref(false);

onMounted(() => {
  if (!connectionStore.connections.length) {
    void connectionStore.loadPersistData();
  }
});

const tagPendingDelete = computed(() => {
  if (!deleteTagId.value) return null;
  return store.tags.find(tag => tag.id === deleteTagId.value) ?? null;
});

const affectedConnections = computed(() => {
  if (!deleteTagId.value) return [];
  return connectionStore.connections.filter(connection =>
    connection.tagIds?.includes(deleteTagId.value as string)
  );
});

const hasAffectedConnections = computed(
  () => affectedConnections.value.length > 0
);

const closeDeleteDialog = () => {
  if (isDeleting.value) return;
  deleteTagId.value = null;
};

const confirmDelete = async (id = deleteTagId.value) => {
  if (!id || isDeleting.value) return;

  isDeleting.value = true;
  try {
    await store.deleteTag(id);
    deleteTagId.value = null;
  } finally {
    isDeleting.value = false;
  }
};

const handleDelete = async (id: string) => {
  const isUsedByConnections = connectionStore.connections.some(connection =>
    connection.tagIds?.includes(id)
  );

  if (!isUsedByConnections) {
    await confirmDelete(id);
    return;
  }

  deleteTagId.value = id;
};
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto gap-6">
    <div>
      <div class="mb-3 flex items-center justify-between gap-3">
        <h4
          class="text-sm font-medium leading-7 text-primary flex items-center gap-1.5"
        >
          <Icon name="hugeicons:tag-01" class="size-4!" />
          All Tags
        </h4>

        <Button
          type="button"
          size="xs"
          variant="outline"
          @click="isCreateTagDialogOpen = true"
        >
          <Icon name="hugeicons:plus-sign" class="size-3.5!" />
          Create New Tag
        </Button>
      </div>

      <div
        v-if="store.tags.length === 0"
        class="text-sm text-muted-foreground py-2"
      >
        No tags yet. Click Create New Tag to add your first tag.
      </div>

      <ul v-else class="space-y-2">
        <li
          v-for="tag in store.tags"
          :key="tag.id"
          class="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
        >
          <div class="flex items-center gap-2 min-w-0">
            <EnvTagBadge :tag="tag" />
            <span
              v-if="tag.strictMode"
              class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
            >
              <Icon name="hugeicons:shield-user" class="size-3!" />
              Strict
            </span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="iconMd"
              class="text-muted-foreground hover:text-foreground"
              aria-label="Edit tag"
              @click="editingTag = tag"
            >
              <Icon name="hugeicons:edit-02" class="size-4!" />
            </Button>
            <Button
              v-if="!tag.isSystem"
              type="button"
              variant="ghost"
              size="iconMd"
              class="text-muted-foreground hover:text-destructive"
              aria-label="Delete tag"
              @click="handleDelete(tag.id)"
            >
              <Icon name="hugeicons:delete-02" class="size-4!" />
            </Button>
          </div>
        </li>
      </ul>
    </div>

    <CreateEnvTagDialog v-model:open="isCreateTagDialogOpen" />

    <CreateEnvTagDialog
      :open="!!editingTag"
      :editing-tag="editingTag"
      @update:open="!$event && (editingTag = null)"
    />

    <AlertDialog
      :open="!!deleteTagId && hasAffectedConnections"
      @update:open="!$event && closeDeleteDialog()"
    >
      <AlertDialogContent class="border">
        <AlertDialogHeader>
          <AlertDialogTitle class="flex items-center gap-2">
            <Icon name="hugeicons:alert-02" class="size-5 text-destructive" />
            Delete tag?
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span v-if="tagPendingDelete">
              The tag
              <span class="font-medium text-foreground">
                {{ tagPendingDelete.name }}
              </span>
              is used by {{ affectedConnections.length }} connection
              {{ affectedConnections.length > 1 ? 's' : '' }}. Deleting it will
              also remove this tag from those connections.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="rounded-md border bg-muted/40 px-3 py-2">
          <p class="text-sm font-medium">Affected connections</p>
          <ul class="mt-2 space-y-1 text-sm text-muted-foreground">
            <li
              v-for="connection in affectedConnections"
              :key="connection.id"
              class="truncate"
            >
              {{ connection.name }}
            </li>
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel class="border" @click="closeDeleteDialog">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            class="border bg-red-600 hover:bg-red-700"
            :disabled="isDeleting"
            @click="confirmDelete()"
          >
            Delete Tag
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
