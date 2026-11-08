import { buildTableNodeId } from '~/components/modules/erd-diagram/utils';
import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useSchemaStore } from '~/core/stores/useSchemaStore';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import type {
  CommandItem,
  CommandProvider,
} from '../../types/commandEngine.types';

const PREFIX = {
  key: 'erd:',
  label: 'ERD',
  placeholder: 'Open ERD for table...',
  icon: 'hugeicons:flowchart-01',
} as const;

export function useErdCommands(): CommandProvider {
  const schemaStore = useSchemaStore();
  const tabViewsStore = useTabViewsStore();
  const { workspaceId, connectionId } = useWorkspaceConnectionRoute();

  return {
    prefix: PREFIX,
    includeInGlobal: true,
    resolve(query: string): CommandItem[] {
      const lowerQuery = query.toLowerCase();
      const schemaName = schemaStore.activeSchema?.name || '';

      const tables = schemaStore.activeSchema?.tables || [];

      return tables
        .filter(name => !lowerQuery || name.toLowerCase().includes(lowerQuery))
        .map(tableName => {
          const tableNodeId = buildTableNodeId({ schemaName, tableName });
          const tabId = `erd-${tableNodeId}`;

          return {
            id: `erd-${schemaName}-${tableName}`,
            label: tableName,
            icon: 'hugeicons:flowchart-01',
            group: 'ERD Diagram',
            description: schemaName,
            execute: async () => {
              await tabViewsStore.openTab({
                id: tabId,
                name: tableName,
                icon: 'hugeicons:flowchart-01',
                type: TabViewType.DetailERD,
                routeName: 'workspaceId-connectionId-erd-tableId',
                routeParams: {
                  workspaceId: workspaceId.value,
                  connectionId: connectionId.value,
                  tableId: tableNodeId,
                },
                connectionId: connectionId.value,
                workspaceId: workspaceId.value,
                schemaId: schemaName,
                metadata: {
                  type: TabViewType.DetailERD,
                  tableName,
                  treeNodeId: tableNodeId,
                },
              });
              await tabViewsStore.selectTab(tabId);
            },
          };
        });
    },
  };
}
