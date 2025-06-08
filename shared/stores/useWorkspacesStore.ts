import { defineStore } from 'pinia';
import { ref } from 'vue';

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
    const workspaces = ref<Workspace[]>([]);
    const selectedWorkspaceId = ref<string>();

    const setSelectedWorkspaceId = (workspaceId: string) => {
      selectedWorkspaceId.value = workspaceId;
    };

    const selectedWorkspace = computed(() => {
      return workspaces.value.find(
        workspace => workspace.id === selectedWorkspaceId.value
      );
    });

    const createWorkspace = async (workspace: Workspace) => {
      await window.workspaceApi.create(workspace);

      workspaces.value.push(workspace);
    };

    const updateWorkspace = async (workspace: Workspace) => {
      console.log('🚀 ~ updateWorkspace ~ workspace:', workspace);

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
      selectedWorkspaceId,
      setSelectedWorkspaceId,
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
