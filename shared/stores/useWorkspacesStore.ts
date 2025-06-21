import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import { useWSStateStore } from './useWSStateStore';

export interface Workspace {
  id: string;
  icon: string;
  name: string;
  desc?: string;
  lastOpened?: string;
  createdAt: string;
  updatedAt?: string;
}

export const useWorkspacesStore = defineStore(
  'workspaces',
  () => {
    const wsStateStore = useWSStateStore();
    const { workspaceId } = toRefs(wsStateStore);

    const workspaces = ref<Workspace[]>([]);

    const selectedWorkspace = computed(() => {
      return workspaces.value.find(
        workspace => workspace.id === workspaceId.value
      );
    });

    const createWorkspace = async (workspace: Workspace) => {
      await window.workspaceApi.create(workspace);

      await wsStateStore.onCreateNewWSState({
        id: workspace.id,
      });

      workspaces.value.push(workspace);
    };

    const updateWorkspace = async (workspace: Workspace) => {
      await window.workspaceApi.update(workspace);
      await loadPersistData();
    };

    const updateLastOpened = async (workspaceId: string) => {
      const workspace = workspaces.value.find(ws => ws.id === workspaceId);

      if (!workspace) {
        throw new Error('No workspace found');
        return;
      }

      await updateWorkspace({
        ...workspace,
        lastOpened: dayjs().toISOString(),
      });
    };

    const deleteWorkspace = async (workspaceId: string) => {
      await window.workspaceApi.delete(workspaceId);
      await loadPersistData();
    };

    const loadPersistData = async () => {
      console.time('loadPersistData');
      const load = await window.workspaceApi.getAll();

      console.log('🚀 ~ loadPersistData ~ load:', load);

      workspaces.value = load;
      console.timeEnd('loadPersistData');
    };

    loadPersistData();

    return {
      workspaces,
      createWorkspace,
      deleteWorkspace,
      updateWorkspace,
      selectedWorkspace,
      updateLastOpened,
    };
  },
  {
    persist: false,
  }
);
