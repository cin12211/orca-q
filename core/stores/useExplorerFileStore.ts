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

    const updateFile = async (file: Partial<RowQueryFile> & { id: string }) => {
      const files = flatNodes.value;
      const index = files.findIndex(f => f.id === file.id);
      if (index === -1) return;

      Object.assign(files[index], file, { updatedAt: dayjs().toString() });

      await window.rowQueryFilesApi.updateFile(file);
    };

    const updateFileContent = async (fileContent: RowQueryFileContent) => {
      await window.rowQueryFilesApi.updateFileContent(fileContent);
    };

    const deleteFiles = async (fileIds: string[]) => {
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
      const contents = await window.rowQueryFilesApi.getFileContentById(fileID);
      return {
        contents: contents?.contents || '',
        variables: contents?.variables || '',
      };
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
      treeNodeRef,
    };
  },
  {
    persist: false,
  }
);
