import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import {
  TreeManager,
  type TreeFileSystemItem,
} from '~/components/base/Tree/treeManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';

export type RowQueryFile = TreeFileSystemItem;

export interface RowQueryFileContent {
  id: string;
  contents: string;
}

const sanitizeRowQueryFile = <T extends { connectionId?: string }>(file: T) => {
  const { connectionId: _connectionId, ...sanitized } = file;
  return sanitized as Omit<T, 'connectionId'> & { connectionId?: never };
};

export const useExplorerFileStore = defineStore(
  'explorerFile-store',
  () => {
    const { workspaceId } = useWorkspaceConnectionRoute();

    const treeNodeRef = ref<InstanceType<typeof TreeManager>>(
      new TreeManager([])
    );

    const flatNodes = ref<RowQueryFile[]>([]);

    const contentCache = new Map<string, { contents: string }>();

    const getFileContentByIdSync = (fileID: string) =>
      contentCache.get(fileID) ?? null;

    const updateFile = async (file: Partial<RowQueryFile> & { id: string }) => {
      const files = flatNodes.value;
      const index = files.findIndex(f => f.id === file.id);
      if (index === -1) return;

      const sanitizedFile = sanitizeRowQueryFile(file);

      Object.assign(files[index], sanitizedFile, {
        updatedAt: dayjs().toString(),
      });
      delete files[index].connectionId;

      await window.rowQueryFilesApi.updateFile(sanitizedFile);
    };

    const updateFileContent = async (fileContent: RowQueryFileContent) => {
      // Keep cache in sync so the next synchronous read returns fresh data.
      contentCache.set(fileContent.id, {
        contents: fileContent.contents,
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
      const sanitizedFile = sanitizeRowQueryFile(file) as TreeFileSystemItem;
      flatNodes.value.push(sanitizedFile);

      return await window.rowQueryFilesApi.createFiles(sanitizedFile);
    };

    const updateNodes = async (files: TreeFileSystemItem[]) => {
      const sanitizedFiles = files.map(file => {
        return sanitizeRowQueryFile(file) as TreeFileSystemItem;
      });
      const mapFile = new Map(sanitizedFiles.map(item => [item.id, item]));

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
        sanitizedFiles.map(async file => {
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
      };
      contentCache.set(fileID, result);
      return result;
    };

    const initLoadRowQuery = async (workspaceId: string) => {
      const filesValue = (
        await window.rowQueryFilesApi.getFilesByContext({
          workspaceId,
        })
      ).map(file => sanitizeRowQueryFile(file) as RowQueryFile);

      flatNodes.value = filesValue;

      const tree = new TreeManager(filesValue, {
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
      workspaceId,
      async currentWorkspaceId => {
        if (!currentWorkspaceId) {
          return;
        }
        await initLoadRowQuery(currentWorkspaceId);
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
