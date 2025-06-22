import { defineStore } from 'pinia';
import { ref } from 'vue';
import dayjs from 'dayjs';
import { uuidv4 } from '~/lib/utils';
import { useWSStateStore } from './useWSStateStore';

export interface QuickQueryLog {
  connectionId: string;
  workspaceId: string;
  schemaId: string;
  tableId: string;
  id: string;
  logs: string;
  timeQuery: number; // in milliseconds
  createdAt: string;
  updatedAt?: string;
}

export const useQuickQueryLogs = defineStore(
  'quick-query-logs',
  () => {
    const wsStateStore = useWSStateStore();
    const { connectionId } = toRefs(wsStateStore);

    const qqLogs = ref<QuickQueryLog[]>([]);

    const getLogsByTableId = (tableId: string) => {
      return qqLogs.value.filter(
        log =>
          log.tableId === tableId &&
          log.schemaId === wsStateStore.schemaId &&
          log.connectionId === connectionId.value
      );
    };

    const createLog = async (
      log: Pick<QuickQueryLog, 'logs' | 'tableId' | 'timeQuery'>
    ) => {
      if (
        !connectionId.value ||
        !wsStateStore.schemaId ||
        !wsStateStore.workspaceId
      ) {
        console.error('connectionId or schemaId not found');
        return;
      }

      const logTmp: QuickQueryLog = {
        ...log,
        connectionId: connectionId.value,
        workspaceId: wsStateStore.workspaceId,
        schemaId: wsStateStore.schemaId,
        createdAt: dayjs().toISOString(),
        id: uuidv4(),
      };
      await window.quickQueryLogsApi.create(logTmp);
      qqLogs.value.push(logTmp);
    };

    const deleteLogsOfTable = async (tableId: string) => {
      if (!connectionId.value || !wsStateStore.schemaId) {
        console.error('connectionId or schemaId not found');
        return;
      }

      await window.quickQueryLogsApi.delete({
        connectionId: connectionId.value,
        schemaId: wsStateStore.schemaId,
        tableId,
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
