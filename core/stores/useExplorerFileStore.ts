import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import {
  TreeManager,
  type TreeFileSystemItem,
} from '~/components/base/Tree/treeManagement';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { uuidv4 } from '~/core/helpers';
import { createStorageApis } from '~/core/storage';

export type RowQueryFile = TreeFileSystemItem;

export interface RowQueryFileContent {
  id: string;
  contents: string;
}

const RAW_QUERY_FILE_ICON = 'lucide:file';

export interface QueryFileNamingConfig {
  starterFileName: string;
  newFileBaseName: string;
  starterContents?: string;
  extension?: string;
}

export const DEFAULT_SQL_QUERY_FILE_CONFIG: QueryFileNamingConfig = {
  starterFileName: 'sample.sql',
  newFileBaseName: 'new-file',
  extension: '.sql',
};

export const buildGeneratedQueryFileName = (
  config: QueryFileNamingConfig,
  index: number
) => {
  const extension = config.extension ?? '';

  return index <= 1
    ? `${config.newFileBaseName}${extension}`
    : `${config.newFileBaseName}-${index}${extension}`;
};

const sanitizeRowQueryFile = <T extends { connectionId?: string }>(file: T) => {
  const { connectionId: _connectionId, ...sanitized } = file;
  return sanitized as Omit<T, 'connectionId'> & { connectionId?: never };
};

export const useExplorerFileStore = defineStore(
  'explorerFile-store',
  () => {
    const storageApis = createStorageApis();
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

      await storageApis.rowQueryFileStorage.updateFile(sanitizedFile);
    };

    const updateFileContent = async (fileContent: RowQueryFileContent) => {
      // Keep cache in sync so the next synchronous read returns fresh data.
      contentCache.set(fileContent.id, {
        contents: fileContent.contents,
      });
      await storageApis.rowQueryFileStorage.updateFileContent(fileContent);
    };

    const deleteFiles = async (fileIds: string[]) => {
      fileIds.forEach(id => contentCache.delete(id));
      flatNodes.value = flatNodes.value.filter(f => !fileIds.includes(f.id));

      await Promise.all(
        fileIds.map(async fileId => {
          return await storageApis.rowQueryFileStorage.deleteFile({
            id: fileId,
          });
        })
      );
    };

    const addNode = async (file: TreeFileSystemItem) => {
      const sanitizedFile = sanitizeRowQueryFile(file) as TreeFileSystemItem;
      flatNodes.value.push(sanitizedFile);

      return await storageApis.rowQueryFileStorage.createFiles(
        sanitizedFile as unknown as Parameters<
          typeof storageApis.rowQueryFileStorage.createFiles
        >[0]
      );
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

          return await storageApis.rowQueryFileStorage.updateFile(newFile);
        })
      );
    };

    const getFileById = (fileID: string) => {
      return flatNodes.value.find(f => f.id === fileID);
    };

    const getFileByTitle = (title: string) => {
      return flatNodes.value.find(
        file =>
          !file.isFolder && file.title.toLowerCase() === title.toLowerCase()
      );
    };

    const getNextGeneratedQueryFileName = (
      config: QueryFileNamingConfig = DEFAULT_SQL_QUERY_FILE_CONFIG
    ) => {
      const fileNames = new Set(
        flatNodes.value
          .filter(file => !file.isFolder)
          .map(file => file.title.toLowerCase())
      );

      let nextIndex = 1;
      let candidate = buildGeneratedQueryFileName(config, nextIndex);

      while (fileNames.has(candidate.toLowerCase())) {
        nextIndex += 1;
        candidate = buildGeneratedQueryFileName(config, nextIndex);
      }

      return candidate;
    };

    const createRawQueryFile = async ({
      title,
      parentId = null,
    }: {
      title: string;
      parentId?: string | null;
    }) => {
      if (!workspaceId.value) {
        return null;
      }

      const item: TreeFileSystemItem = {
        title,
        id: uuidv4(),
        icon: RAW_QUERY_FILE_ICON,
        workspaceId: workspaceId.value,
        createdAt: dayjs().toISOString(),
        isFolder: false,
        variables: '',
        path: '',
        children: undefined,
        parentId: parentId ?? undefined,
      };

      treeNodeRef.value.insertNode(parentId, item);
      treeNodeRef.value.sortByTitle();

      return getFileById(item.id) ?? item;
    };

    const ensureStarterQueryFile = async (
      config: QueryFileNamingConfig = DEFAULT_SQL_QUERY_FILE_CONFIG
    ) => {
      const existing = getFileByTitle(config.starterFileName);

      if (existing) {
        return existing;
      }

      const file = await createRawQueryFile({ title: config.starterFileName });

      if (file && config.starterContents) {
        await updateFileContent({
          id: file.id,
          contents: config.starterContents,
        });
      }

      return file;
    };

    const createNextQueryFile = async (
      config: QueryFileNamingConfig = DEFAULT_SQL_QUERY_FILE_CONFIG
    ) => {
      return createRawQueryFile({
        title: getNextGeneratedQueryFileName(config),
      });
    };

    const ensureStarterSqlFile = async () => {
      return ensureStarterQueryFile(DEFAULT_SQL_QUERY_FILE_CONFIG);
    };

    const createNextSqlFile = async () => {
      return createNextQueryFile(DEFAULT_SQL_QUERY_FILE_CONFIG);
    };

    const getFileContentById = async (fileID: string) => {
      if (contentCache.has(fileID)) {
        return contentCache.get(fileID)!;
      }
      const raw =
        await storageApis.rowQueryFileStorage.getFileContentById(fileID);
      const result = {
        contents: raw?.contents || '',
      };
      contentCache.set(fileID, result);
      return result;
    };

    const initLoadRowQuery = async (workspaceId: string) => {
      const filesValue = (
        await storageApis.rowQueryFileStorage.getFilesByContext({
          workspaceId,
        })
      ).map(file => sanitizeRowQueryFile(file) as unknown as RowQueryFile);

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
      getFileByTitle,
      getFileContentById,
      getFileContentByIdSync,
      getNextGeneratedQueryFileName,
      ensureStarterQueryFile,
      createNextQueryFile,
      createRawQueryFile,
      ensureStarterSqlFile,
      createNextSqlFile,
      treeNodeRef,
    };
  },
  {
    persist: false,
  }
);
