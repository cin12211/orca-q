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

    const deleteWorkspace = async (workspaceId: string) => {
      await window.workspaceApi.delete(workspaceId);
      await loadWorkspaces();
    };

    const updateWorkspace = async (workspace: Workspace) => {
      await window.workspaceApi.update(workspace.id, workspace);
      await loadWorkspaces();
    };

    const loadWorkspaces = async () => {
      console.time('loadWorkspaces');
      const load = await window.workspaceApi.getAll();
      workspaces.value = load;
      console.timeEnd('loadWorkspaces');
    };

    loadWorkspaces();

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
