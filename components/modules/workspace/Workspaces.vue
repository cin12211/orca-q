<script setup lang="ts">
import { refDebounced } from '@vueuse/core';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Search } from 'lucide-vue-next';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { DEFAULT_DEBOUNCE_INPUT } from '~/utils/constants';
import ManagementConnectionModal from '../management-connection/ManagementConnectionModal.vue';
import WorkspaceCard from './WorkspaceCard.vue';
import WorkspaceHeader from './WorkspaceHeader.vue';

dayjs.extend(relativeTime);

const { workspaceStore } = useAppContext();

const search = shallowRef('');
const debouncedSearch = refDebounced(search, DEFAULT_DEBOUNCE_INPUT);

const mappedWorkspaces = computed(() => {
  return (workspaceStore.workspaces || []).filter(workspace => {
    return workspace.name
      .toLowerCase()
      .includes(debouncedSearch.value.toLowerCase());
  });
});

const isOpenSelectConnectionModal = ref(false);
</script>

<template>
  <ManagementConnectionModal v-model:open="isOpenSelectConnectionModal" />
  <div class="flex flex-col h-full overflow-y-auto p-4 space-y-4">
    <WorkspaceHeader />

    <div class="relative w-full">
      <Search class="absolute left-2.5 top-2 size-6 text-muted-foreground" />
      <Input
        type="text"
        v-model="search"
        placeholder="Search workspaces..."
        class="pl-10 w-full h-10"
      />
    </div>

    <div class="grid grid-cols-3 gap-4 overflow-y-auto">
      <WorkspaceCard
        v-for="workspace in mappedWorkspaces"
        :workspace="workspace"
        @on-select-workspace="isOpenSelectConnectionModal = true"
      />
    </div>
  </div>
</template>
