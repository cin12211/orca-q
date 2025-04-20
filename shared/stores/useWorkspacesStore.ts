import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import { uuidv4 } from '~/lib/utils';

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

    const createWorkspace = (workspace: Workspace) => {
      workspaces.value.push(workspace);
    };

    const deleteWorkspace = (workspaceId: string) => {
      workspaces.value = workspaces.value.filter(
        workspace => workspace.id !== workspaceId
      );
    };

    const updateWorkspace = (workspace: Workspace) => {
      workspaces.value = workspaces.value.map(w => {
        if (w.id === workspace.id) {
          return workspace;
        }
        return w;
      });
    };

    return {
      workspaces,
      selectedWorkspaceId,
      setSelectedWorkspaceId,
      createWorkspace,
      deleteWorkspace,
      updateWorkspace,
    };
  },
  {
    persist: true,
  }
);
