import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import {
  TreeManager,
  type TreeFileSystemItem,
} from '~/components/base/Tree/treeManagement';

export type RowQueryFile = TreeFileSystemItem;

export interface RowQueryFileContent {
  id: string;
  contents: string;
  variables: string;
}

export const useExplorerFileStore = defineStore(
  'explorerFile-store',
  () => {
    const route = useRoute('workspaceId');

    const treeNodeRef = ref<InstanceType<typeof TreeManager>>(
      new TreeManager([])
    );

    const flatNodes = ref<RowQueryFile[]>([]);

    const contentCache = new Map<
      string,
      { contents: string; variables: string }
    >();

    const getFileContentByIdSync = (fileID: string) =>
      contentCache.get(fileID) ?? null;

    const updateFile = async (file: Partial<RowQueryFile> & { id: string }) => {
      const files = flatNodes.value;
      const index = files.findIndex(f => f.id === file.id);
      if (index === -1) return;

      Object.assign(files[index], file, { updatedAt: dayjs().toString() });

      await window.rowQueryFilesApi.updateFile(file);
    };

    const updateFileContent = async (fileContent: RowQueryFileContent) => {
      // Keep cache in sync so the next synchronous read returns fresh data.
      contentCache.set(fileContent.id, {
        contents: fileContent.contents,
        variables: fileContent.variables,
      });
      await window.rowQueryFilesApi.updateFileContent(fileContent);
    };

    const deleteFiles = async (fileIds: string[]) => {
      fileIds.forEach(id => contentCache.delete(id));
      flatNodes.value = flatNodes.value.filter(f => !fileIds.includes(f.id));

      await Promise.all(
        fileIds.map(async fileId => {
          return await window.rowQueryFilesApi.deleteFile({ id: fileId });
        })
      );
    };

    const addNode = async (file: TreeFileSystemItem) => {
      flatNodes.value.push(file);

      return await window.rowQueryFilesApi.createFiles(file);
    };

    const updateNodes = async (files: TreeFileSystemItem[]) => {
      const mapFile = new Map(files.map(item => [item.id, item]));

      flatNodes.value = flatNodes.value.map(f => {
        const file = mapFile.get(f.id);

        if (file) {
          return {
            ...f,
            ...file,
          };
        }

        return f;
      });

      return await Promise.all(
        files.map(async file => {
          const newFile = {
            ...file,
            updateAt: dayjs().toString(),
            children: undefined,
          };

          return await window.rowQueryFilesApi.updateFile(newFile);
        })
      );
    };

    const getFileById = (fileID: string) => {
      return flatNodes.value.find(f => f.id === fileID);
    };

    const getFileContentById = async (fileID: string) => {
      if (contentCache.has(fileID)) {
        return contentCache.get(fileID)!;
      }
      const raw = await window.rowQueryFilesApi.getFileContentById(fileID);
      const result = {
        contents: raw?.contents || '',
        variables: raw?.variables || '',
      };
      contentCache.set(fileID, result);
      return result;
    };

    const initLoadRowQuery = async (workspaceId: string) => {
      const filesValue = await window.rowQueryFilesApi.getFilesByContext({
        workspaceId,
      });

      flatNodes.value = filesValue || [];

      const tree = new TreeManager(filesValue || [], {
        onDelete: async nodes => {
          await deleteFiles(nodes.map(item => item.id));
        },
        onUpdate: async nodes => {
          await updateNodes(nodes);
        },
        onInsert: async nodes => {
          await Promise.all(
            nodes.map(node => {
              return addNode(node);
            })
          );
        },
      });

      tree.sortByTitle();

      treeNodeRef.value = tree;
    };

    watch(
      () => route.params.workspaceId,
      async workspaceId => {
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
      flatNodes,
      updateFile,
      updateFileContent,

      getFileById,
      getFileContentById,
      getFileContentByIdSync,
      treeNodeRef,
    };
  },
  {
    persist: false,
  }
);
