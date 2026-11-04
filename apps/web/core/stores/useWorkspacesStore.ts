import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { createStorageApis } from '~/core/storage';

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
    const storageApis = createStorageApis();
    const { workspaceId } = useWorkspaceConnectionRoute();

    const workspaces = ref<Workspace[]>([]);

    const selectedWorkspace = computed(() => {
      return workspaces.value.find(
        workspace => workspace.id === workspaceId.value
      );
    });

    const createWorkspace = async (workspace: Workspace) => {
      await storageApis.workspaceStorage.create(workspace);

      workspaces.value.push(workspace);
    };

    const updateWorkspace = async (workspace: Workspace) => {
      await storageApis.workspaceStorage.update(workspace);
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
      await storageApis.workspaceStorage.delete(workspaceId);
      await loadPersistData();
    };

    const loadPersistData = async () => {
      console.time('loadPersistData');
      const load = await storageApis.workspaceStorage.getAll();

      workspaces.value = load;
      console.timeEnd('loadPersistData');
    };

    // loadPersistData();

    return {
      workspaces,
      createWorkspace,
      deleteWorkspace,
      updateWorkspace,
      selectedWorkspace,
      updateLastOpened,
      loadPersistData,
    };
  },
  {
    persist: false,
  }
);
