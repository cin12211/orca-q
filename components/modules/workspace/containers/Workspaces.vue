<script setup lang="ts">
import { ManagementConnectionModal } from '../../connection';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal.vue';
import WorkspaceCard from '../components/WorkspaceCard.vue';
import WorkspaceHeader from '../components/WorkspaceHeader.vue';
import { useWorkspaceTour } from '../hooks/useWorkspaceTour';
import { useWorkspaces } from '../hooks/useWorkspaces';

const {
  workspaceStore,
  connectionStore,
  search,
  workspaceId,
  mappedWorkspaces,
  isOpenSelectConnectionModal,
  isOpenCreateWSModal,
  onSelectWorkspace,
} = useWorkspaces();

const { startTour } = useWorkspaceTour({
  isOpenCreateWSModal,
  isOpenSelectConnectionModal,
  workspaceId,
  workspaceStore,
  onSelectWorkspace,
});
</script>

<template>
  <CreateWorkspaceModal
    v-model:open="isOpenCreateWSModal"
    :workspaceSeq="workspaceStore.workspaces.length"
    v-if="isOpenCreateWSModal"
  />

  <ManagementConnectionModal
    v-model:open="isOpenSelectConnectionModal"
    :connections="connectionStore.getConnectionsByWorkspaceId(workspaceId)"
    :workspace-id="workspaceId"
  />
  <div
    id="tour-workspace-area"
    class="flex flex-col h-full overflow-y-auto p-4 pt-0 space-y-4 relative"
  >
    <WorkspaceHeader
      @create="isOpenCreateWSModal = true"
      :is-show-button-create="!!mappedWorkspaces.length"
    />

    <div class="relative w-full">
      <Icon
        name="hugeicons:search-01"
        class="absolute left-2.5 -translate-y-1/2 top-1/2 size-4"
      />
      <Input
        type="text"
        v-model="search"
        placeholder="Search workspaces..."
        class="pl-10 w-full"
      />
    </div>

    <div
      class="grid grid-cols-3 gap-4 overflow-y-auto"
      v-if="mappedWorkspaces.length"
    >
      <WorkspaceCard
        v-for="workspace in mappedWorkspaces"
        :workspace="workspace"
        @on-select-workspace="onSelectWorkspace"
      />
    </div>
    <BaseEmpty
      v-else
      title="No workspaces found"
      desc="There is nothing here to show. Let's create your first workspace."
    >
      <div class="flex items-center gap-2">
        <Button
          id="tour-new-workspace-btn-empty"
          variant="default"
          size="sm"
          @click="isOpenCreateWSModal = true"
        >
          <Icon name="hugeicons:plus-sign" />
          New Workspace
        </Button>
        <Button variant="secondary" size="sm" @click="startTour">
          <Icon name="hugeicons:book-open-02" />
          Take a tour
        </Button>
      </div>
    </BaseEmpty>

    <Button
      class="fixed bottom-15 right-4"
      variant="secondary"
      @click="startTour"
      title="Start Tour"
    >
      <Icon name="hugeicons:book-open-02" /> Take a tour
    </Button>
  </div>
</template>
