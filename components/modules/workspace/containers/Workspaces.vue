<script setup lang="ts">
import { Search } from 'lucide-vue-next';
import { ManagementConnectionModal } from '../../connection';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal.vue';
import WorkspaceCard from '../components/WorkspaceCard.vue';
import WorkspaceHeader from '../components/WorkspaceHeader.vue';
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
  <div class="flex flex-col h-full overflow-y-auto p-4 pt-0 space-y-4">
    <WorkspaceHeader
      @create="isOpenCreateWSModal = true"
      :is-show-button-create="!!mappedWorkspaces.length"
    />

    <div class="relative w-full">
      <Search class="absolute left-2.5 top-1.5 size-6 text-muted-foreground" />
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
    <div
      v-else
      class="flex flex-col items-center justify-center h-full pb-[20vh]"
    >
      <div class="text-xl font-medium">There's no workspaces</div>
      <div class="mb-4 text-muted-foreground">
        There is nothing here to show, Let's create one
      </div>
      <Button variant="default" size="sm" @click="isOpenCreateWSModal = true">
        <Icon name="lucide:plus" />

        New Workspace</Button
      >
    </div>
  </div>
</template>
