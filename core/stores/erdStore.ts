import { defineStore } from 'pinia';
import type { TableMetadata } from '~/core/types';

export const useErdStore = defineStore(
  'erdStore',
  () => {
    const currentConnectionId = ref<string>('');
    const tables = ref<TableMetadata[]>([]);

    function setTables(newTables: TableMetadata[]) {
      tables.value = newTables;
    }

    function setCurrentConnectionId(connectionId: string) {
      currentConnectionId.value = connectionId;
    }

    return {
      currentConnectionId,
      tables,
      setTables,
      setCurrentConnectionId,
    };
  },
  {
    persist: false,
  }
);
