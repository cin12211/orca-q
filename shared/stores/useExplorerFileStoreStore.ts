import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import { tree, type TreeFileSystemItem } from '~/components/base/Tree';

export type RowQueryFile = TreeFileSystemItem;

export interface RowQueryFileContent {
  id: string;
  contents: string;
}

export const useExplorerFileStoreStore = defineStore(
  'explorerFile-store',
  () => {
    const route = useRoute('workspaceId');

    const files = ref<RowQueryFile[]>([]);
    const explorerFileTree = ref<RowQueryFile[]>([]);

    const updateFile = async (file: Partial<RowQueryFile> & { id: string }) => {
      const index = files.value.findIndex(f => f.id === file.id);

      files.value[index] = {
        ...files.value[index],
        ...file,
        updateAt: dayjs().toString(),
      };

      await window.rowQueryFilesApi.updateFile(file);
    };

    const batchUpdateTreeFiles = async (treeFilesValue: RowQueryFile[]) => {
      explorerFileTree.value = treeFilesValue;

      const treeFiles = tree.flattenTree(treeFilesValue);

      try {
        await Promise.all(
          treeFiles.map(async file => {
            const { children, ...rest } = file;
            return await window.rowQueryFilesApi.createFiles(toRaw(rest));
          })
        );
      } catch {}

      const filesValue = await window.rowQueryFilesApi.getFilesByContext({
        workspaceId: route.params.workspaceId,
      });

      files.value = filesValue;
    };

    const updateFileContent = async (fileContent: RowQueryFileContent) => {
      await window.rowQueryFilesApi.updateFileContent(fileContent);
    };

    const deleteFiles = async (fileIds: string[]) => {
      files.value = files.value.filter(f => !fileIds.includes(f.id));

      await Promise.all(
        fileIds.map(async fileId => {
          return await window.rowQueryFilesApi.deleteFile({ id: fileId });
        })
      );
    };

    const getFileById = (fileID: string) => {
      return files.value.find(f => f.id === fileID);
    };

    const getFileContentById = async (fileID: string) => {
      const contents = await window.rowQueryFilesApi.getFileContentById(fileID);
      return contents?.contents || '';
    };

    // const createNewFile = async (file: RowQueryFile) => {
    //   files.value.push(file);
    //   return await window.rowQueryFilesApi.createFiles(file);
    // };

    const initLoadRowQuery = async (workspaceId: string) => {
      const filesValue = await window.rowQueryFilesApi.getFilesByContext({
        workspaceId,
      });

      files.value = filesValue;

      let treeFiles = tree.buildTree(filesValue);

      explorerFileTree.value = tree.sortChildrenByPath({
        items: treeFiles,
      });
    };

    watch(
      () => route.params.workspaceId,
      async workspaceId => {
        console.log('workspaceId', workspaceId);
        if (!workspaceId) {
          return;
        }
        await initLoadRowQuery(workspaceId as string);
      },
      {
        immediate: true,
      }
    );

    return {
      updateFile,
      updateFileContent,
      getFileById,
      batchUpdateTreeFiles,
      explorerFileTree,
      deleteFiles,
      getFileContentById,
    };
  },
  {
    persist: false,
  }
);
