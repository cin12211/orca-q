import { refDebounced } from '@vueuse/core';
import { computed, ref, shallowRef } from 'vue';
import { DEFAULT_DEBOUNCE_INPUT } from '~/core/constants';
import { useAppContext } from '~/core/contexts/useAppContext';

export function useWorkspaces() {
  const { workspaceStore, connectionStore } = useAppContext();

  const search = shallowRef('');
  const workspaceId = ref('');
  const debouncedSearch = refDebounced(search, DEFAULT_DEBOUNCE_INPUT);

  const mappedWorkspaces = computed(() => {
    return (workspaceStore.workspaces || []).filter(workspace => {
      return workspace.name
        .toLowerCase()
        .includes(debouncedSearch.value.toLowerCase());
    });
  });

  const isOpenSelectConnectionModal = ref(false);
  const isOpenCreateWSModal = ref(false);

  const onSelectWorkspace = (id: string) => {
    isOpenSelectConnectionModal.value = true;
    workspaceId.value = id;
  };

  return {
    workspaceStore,
    connectionStore,
    search,
    workspaceId,
    mappedWorkspaces,
    isOpenSelectConnectionModal,
    isOpenCreateWSModal,
    onSelectWorkspace,
  };
}
