import { useWorkspacesStore } from '../stores';

export const useCurrentWorkspaceId = () => {
  const store = useWorkspacesStore();

  const route = useRoute();

  const workspaceId = computed(() => {
    return route.params.workspaceId || store.selectedWorkspaceId || '';
  });
  return workspaceId;
};
