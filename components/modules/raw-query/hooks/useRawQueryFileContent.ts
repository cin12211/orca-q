import type { FieldDef } from 'pg';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useExplorerFileStore } from '~/core/stores';
import { useManagementConnectionStore } from '~/core/stores/managementConnectionStore';

export function useRawQueryFileContent() {
  const { workspaceId, connectionId: openedConnectionId } =
    useWorkspaceConnectionRoute();
  const route = useRoute('workspaceId-connectionId-explorer-fileId');
  const explorerFileStore = useExplorerFileStore();
  const connectionStore = useManagementConnectionStore();

  const cachedContent = explorerFileStore.getFileContentByIdSync(
    route.params.fileId as string
  );
  const fileContents = ref(cachedContent?.contents ?? '');
  const fileVariables = ref('');
  const selectedConnectionId = ref('');

  const fieldDefs = ref<FieldDef[]>([]);

  const currentFile = computed(() => {
    return explorerFileStore?.flatNodes?.find(
      f => f.id === route.params.fileId
    );
  });

  watch(
    () => currentFile.value?.variables,
    variables => {
      fileVariables.value = variables || '';
    },
    {
      immediate: true,
    }
  );

  const connectionsByWsId = computed(() => {
    return connectionStore.getConnectionsByWorkspaceId(workspaceId.value);
  });

  const currentOpenedConnection = computed(() => {
    return connectionsByWsId.value.find(
      connection => connection.id === openedConnectionId.value
    );
  });

  watch(
    [() => route.params.fileId, openedConnectionId],
    () => {
      selectedConnectionId.value = openedConnectionId.value;
    },
    {
      immediate: true,
    }
  );

  const connection = computed(() => {
    return connectionsByWsId.value.find(
      connection => connection.id === selectedConnectionId.value
    );
  });

  const updateSelectedConnection = (connectionId: string) => {
    selectedConnectionId.value = connectionId;
  };

  const updateFileCursorPos = (cursorPos: { from: number; to: number }) => {
    if (!currentFile.value?.id) return;

    explorerFileStore.updateFile({
      id: currentFile.value.id,
      cursorPos,
    });
  };

  const updateFileContent = async (fileContentsValue: string) => {
    if (!currentFile.value?.id) return;

    fileContents.value = fileContentsValue;

    explorerFileStore.updateFileContent({
      contents: fileContentsValue,
      id: currentFile.value.id,
    });
  };

  const updateFileVariables = async (fileVariablesValue: string) => {
    if (!currentFile.value?.id) return;

    fileVariables.value = fileVariablesValue;

    explorerFileStore.updateFile({
      id: currentFile.value.id,
      variables: fileVariablesValue,
    });
  };

  const isFromCache = cachedContent !== null;

  const loadFileContent = async () => {
    const { contents } = await explorerFileStore.getFileContentById(
      route.params.fileId as string
    );
    fileContents.value = contents;
    fileVariables.value = currentFile.value?.variables || '';
  };

  //TODO: for edit inline table after query
  // const mappedColumns = computed<MappedRawColumn[]>(() => {
  //   return formatColumnsInfo({
  //     activeSchema: activeSchema.value,
  //     fieldDefs: fieldDefs.value,
  //     getTableInfoById: schemaStore.getTableInfoById,
  //   });
  // });

  return {
    fieldDefs,
    // mappedColumns,
    fileContents,
    fileVariables,
    currentFile,
    selectedConnectionId,
    updateSelectedConnection,
    updateFileContent,
    updateFileVariables,
    connection,
    currentOpenedConnection,
    connectionsByWsId,
    updateFileCursorPos,
    loadFileContent,
    isFromCache,
  };
}
