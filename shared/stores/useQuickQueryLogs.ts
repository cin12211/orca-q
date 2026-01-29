import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import { uuidv4 } from '~/lib/utils';
import { useWSStateStore } from './useWSStateStore';

export interface QuickQueryLog {
  connectionId: string;
  workspaceId: string;
  schemaName: string;
  tableName: string;
  id: string;
  logs: string;
  queryTime: number; // in milliseconds
  createdAt: string;
  updatedAt?: string;
  error?: Record<string, any>;
  errorMessage?: string;
}

export const useQuickQueryLogs = defineStore(
  'quick-query-logs',
  () => {
    const wsStateStore = useWSStateStore();
    const { connectionId } = toRefs(wsStateStore);

    const qqLogs = ref<QuickQueryLog[]>([]);

    const getLogsByTableId = ({
      tableName,
      schemaName,
    }: {
      tableName: string;
      schemaName: string;
    }) => {
      return qqLogs.value.filter(
        log =>
          log.tableName === tableName &&
          log.schemaName === schemaName &&
          log.connectionId === connectionId.value
      );
    };

    const createLog = async (
      log: Pick<
        QuickQueryLog,
        | 'logs'
        | 'queryTime'
        | 'tableName'
        | 'schemaName'
        | 'error'
        | 'errorMessage'
      >
    ) => {
      if (!connectionId.value || !wsStateStore.workspaceId) {
        console.error('connectionId or schemaId not found');
        return;
      }

      const logTmp: QuickQueryLog = {
        ...log,
        connectionId: connectionId.value,
        workspaceId: wsStateStore.workspaceId,
        createdAt: dayjs().toISOString(),
        id: uuidv4(),
      };
      await window.quickQueryLogsApi.create(logTmp);
      qqLogs.value.push(logTmp);
    };

    const deleteLogsOfTable = async ({
      tableName,
      schemaName,
    }: {
      tableName: string;
      schemaName: string;
    }) => {
      if (!connectionId.value) {
        console.error('connectionId or schemaId not found');
        return;
      }

      await window.quickQueryLogsApi.delete({
        connectionId: connectionId.value,
        tableName,
        schemaName,
      });

      await loadPersistData(connectionId.value);
    };

    const deleteAllLogs = async () => {
      if (!connectionId.value) {
        console.error('connectionId not found');
        return;
      }

      await window.quickQueryLogsApi.delete({
        connectionId: connectionId.value,
      });
      await loadPersistData(connectionId.value);
    };

    const loadPersistData = async (connectionId: string) => {
      const load = await window.quickQueryLogsApi.getByContext({
        connectionId: connectionId,
      });

      qqLogs.value = load;
    };

    watch(
      () => [connectionId.value],
      async () => {
        if (!connectionId.value) {
          console.error('connectionId not found');
          return;
        }

        await loadPersistData(connectionId.value);
      },
      {
        deep: true,
        immediate: true,
      }
    );

    return {
      qqLogs,
      getLogsByTableId,
      deleteAllLogs,
      deleteLogsOfTable,
      createLog,
    };
  },
  {
    persist: false,
  }
);
