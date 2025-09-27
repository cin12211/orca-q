import type { FieldDef } from 'pg';
import { useAppContext } from '~/shared/contexts/useAppContext';
import { useExplorerFileStoreStore } from '~/shared/stores';
import type { MappedRawColumn } from '../interfaces';
import { formatColumnsInfo } from '../utils';

//TODO: create lint check error for sql
// https://www.npmjs.com/package/node-sql-parser?activeTab=readme
// https://codemirror.net/examples/lint/

export function useRawQueryFileContent() {
  const route = useRoute('workspaceId-connectionId-explorer-fileId');
  const explorerFileStore = useExplorerFileStoreStore();
  const { schemaStore, connectionStore } = useAppContext();
  const { activeSchema } = toRefs(schemaStore);

  const fileContents = ref('');
  const fileVariables = ref('');

  const fieldDefs = ref<FieldDef[]>([]);

  const currentFile = computed(() =>
    explorerFileStore.getFileById(route.params.fileId as string)
  );

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

  onMounted(async () => {
    const { contents, variables } = await explorerFileStore.getFileContentById(
      route.params.fileId as string
    );

    fileContents.value = contents;
    fileVariables.value = variables;
  });

  const mappedColumns = computed<MappedRawColumn[]>(() => {
    return formatColumnsInfo({
      activeSchema: activeSchema.value,
      fieldDefs: fieldDefs.value,
      getTableInfoById: schemaStore.getTableInfoById,
    });
  });

  return {
    fieldDefs,
    mappedColumns,
    fileContents,
    fileVariables,
    currentFile,
    updateFileConnection,
    updateFileContent,
    updateFileVariables,
    connection,
    connectionsByWsId,
    activeSchema,
    updateFileCursorPos,
  };
}
