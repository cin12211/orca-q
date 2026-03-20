import { useSchemaStore } from '~/core/stores/useSchemaStore';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { useWSStateStore } from '~/core/stores/useWSStateStore';
import type {
  CommandItem,
  CommandProvider,
} from '../../types/commandEngine.types';

const PREFIX = {
  key: 't:',
  label: 'Tables',
  placeholder: 'Search tables...',
  icon: 'hugeicons:grid-table',
  iconClass: 'text-yellow-400',
} as const;

export function useTableCommands(): CommandProvider {
  const schemaStore = useSchemaStore();
  const tabViewsStore = useTabViewsStore();
  const wsState = useWSStateStore();

  return {
    prefix: PREFIX,
    includeInGlobal: true,
    resolve(query: string): CommandItem[] {
      const lowerQuery = query.toLowerCase();

      return schemaStore.schemasByContext.flatMap(schema =>
        schema.tables
          .filter(
            name => !lowerQuery || name.toLowerCase().includes(lowerQuery)
          )
          .map(tableName => ({
            id: `table-${schema.name}-${tableName}`,
            label: tableName,
            icon: 'hugeicons:grid-table',
            iconClass: 'text-yellow-400',
            group: 'Tables',
            description: schema.name,
            execute: async () => {
              const tabId = `${tableName}-${schema.name}`;
              await tabViewsStore.openTab({
                id: tabId,
                name: tableName,
                icon: 'hugeicons:grid-table',
                iconClass: 'text-yellow-400',
                type: TabViewType.TableDetail,
                routeName: 'workspaceId-connectionId-quick-query-tabViewId',
                routeParams: { tabViewId: tabId },
                connectionId: wsState.connectionId,
                schemaId: schema.name,
                workspaceId: wsState.workspaceId,
                metadata: {
                  type: TabViewType.TableDetail,
                  tableName,
                },
              });
              await tabViewsStore.selectTab(tabId);
            },
          }))
      );
    },
  };
}
