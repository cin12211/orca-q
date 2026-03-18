import type { FieldDef } from 'pg';
import { useAppContext } from '~/core/contexts/useAppContext';
import { useExplorerFileStore } from '~/core/stores';

export function useRawQueryFileContent() {
  const route = useRoute('workspaceId-connectionId-explorer-fileId');
  const explorerFileStore = useExplorerFileStore();
  const { connectionStore } = useAppContext();

  const cachedContent = explorerFileStore.getFileContentByIdSync(
    route.params.fileId as string
  );
  const fileContents = ref(cachedContent?.contents ?? '');
  const fileVariables = ref(cachedContent?.variables ?? '');

  const fieldDefs = ref<FieldDef[]>([]);

  const currentFile = computed(() => {
    return explorerFileStore?.flatNodes?.find(
      f => f.id === route.params.fileId
    );
  });

  const connectionsByWsId = computed(() => {
    return connectionStore.getConnectionsByWorkspaceId(
      route.params.workspaceId || ''
    );
  });

  const connection = computed(() => {
    return connectionsByWsId.value.find(
      connection => connection.id === currentFile.value?.connectionId
    );
  });

  const updateFileConnection = async (connectionId: string) => {
    if (!currentFile.value?.id) return;

    await explorerFileStore.updateFile({
      id: currentFile.value.id,
      connectionId,
    });
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
      variables: fileVariables.value || '',
    });
  };

  const updateFileVariables = async (fileVariablesValue: string) => {
    if (!currentFile.value?.id) return;

    fileVariables.value = fileVariablesValue;

    explorerFileStore.updateFileContent({
      contents: fileContents.value,
      id: currentFile.value.id,
      variables: fileVariablesValue,
    });
  };

  const isFromCache = cachedContent !== null;

  const loadFileContent = async () => {
    const { contents, variables } = await explorerFileStore.getFileContentById(
      route.params.fileId as string
    );
    fileContents.value = contents;
    fileVariables.value = variables;
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
    updateFileConnection,
    updateFileContent,
    updateFileVariables,
    connection,
    connectionsByWsId,
    updateFileCursorPos,
    loadFileContent,
    isFromCache,
  };
}
