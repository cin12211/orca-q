import { computed, ref } from 'vue';
import type { ReferenceElement } from 'reka-ui';
import { useAppContext } from '~/core/contexts/useAppContext';
import { type Connection, type Workspace } from '~/core/stores';

export function useWorkspaceCard(props: {
  workspace: Workspace;
  onSelectWorkspace?: (wsId: string) => void;
}) {
  const {
    workspaceStore,
    connectionStore,
    createConnection,
    openWorkspaceWithConnection,
  } = useAppContext();

  const isOpenEditModal = ref(false);
  const isOpenDeleteModal = ref(false);
  const isOpenConnectionSelector = ref(false);
  const dropdownTriggerRef = ref<ReferenceElement | undefined>();
  const isModalCreateConnectionOpen = ref(false);

  const onConfirmDelete = () => {
    isOpenDeleteModal.value = false;
    workspaceStore.deleteWorkspace(props.workspace.id);
  };

  const connections = computed(() => {
    return connectionStore.getConnectionsByWorkspaceId(props.workspace.id);
  });

  const onOpenWorkspace = () => {
    props.onSelectWorkspace?.(props.workspace.id);
  };

  const onOpenConnectionSelector = () => {
    isOpenConnectionSelector.value = true;
  };

  const onOpenWorkspaceWithConnection = async (connectionId: string) => {
    isOpenConnectionSelector.value = false;

    await openWorkspaceWithConnection({
      connId: connectionId,
      wsId: props.workspace.id,
    });
  };

  const handleAddConnection = (connection: Connection) => {
    createConnection(connection);
  };

  return {
    workspaceStore,
    isOpenEditModal,
    isOpenDeleteModal,
    isOpenConnectionSelector,
    dropdownTriggerRef,
    isModalCreateConnectionOpen,
    connections,
    onConfirmDelete,
    onOpenWorkspace,
    onOpenConnectionSelector,
    onOpenWorkspaceWithConnection,
    handleAddConnection,
  };
}
