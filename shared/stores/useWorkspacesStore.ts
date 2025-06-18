import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useWSStateStore } from './useWSStateStore';

export interface Workspace {
  id: string;
  icon: string;
  name: string;
  desc?: string;
  lastOpened?: string;
  createdAt: string;
}

export const useWorkspacesStore = defineStore(
  'workspaces',
  () => {
    const wsStateStore = useWSStateStore();
    const { workSpaceId } = toRefs(wsStateStore);

    const workspaces = ref<Workspace[]>([]);

    const selectedWorkspace = computed(() => {
      return workspaces.value.find(
        workspace => workspace.id === workSpaceId.value
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

    const deleteWorkspace = async (workspaceId: string) => {
      await window.workspaceApi.delete(workspaceId);
      await loadPersistData();
    };

    const loadPersistData = async () => {
      console.time('loadPersistData');
      const load = await window.workspaceApi.getAll();
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
    };
  },
  {
    persist: false,
  }
);
