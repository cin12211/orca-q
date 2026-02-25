import { useSchemaStore } from '~/core/stores/useSchemaStore';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { useWSStateStore } from '~/core/stores/useWSStateStore';
import { ViewSchemaEnum } from '~/core/types';
import type { CommandItem, CommandProvider } from '../commandEngine.types';

const PREFIX = {
  key: 'v:',
  label: 'Views',
  placeholder: 'Search views...',
  icon: 'hugeicons:property-view',
  iconClass: 'text-green-700',
} as const;

export function useViewCommands(): CommandProvider {
  const schemaStore = useSchemaStore();
  const tabViewsStore = useTabViewsStore();
  const wsState = useWSStateStore();

  return {
    prefix: PREFIX,
    includeInGlobal: true,
    resolve(query: string): CommandItem[] {
      const lowerQuery = query.toLowerCase();

      return schemaStore.schemasByContext.flatMap(schema =>
        schema.views
          .filter(v => !lowerQuery || v.name.toLowerCase().includes(lowerQuery))
          .map(view => {
            const isStandardView = view.type === ViewSchemaEnum.View;
            const icon = isStandardView
              ? 'hugeicons:property-view'
              : 'hugeicons:property-new';
            const iconClass = isStandardView
              ? 'text-green-700'
              : 'text-orange-500';

            return {
              id: `view-${schema.name}-${view.oid}`,
              label: view.name,
              icon,
              iconClass,
              group: 'Views',
              description: schema.name,
              execute: async () => {
                const tabId = `${view.name}-${schema.name}`;
                await tabViewsStore.openTab({
                  id: tabId,
                  name: view.name,
                  icon,
                  iconClass,
                  type: TabViewType.ViewDetail,
                  routeName: 'workspaceId-connectionId-quick-query-tabViewId',
                  routeParams: { tabViewId: tabId },
                  connectionId: wsState.connectionId,
                  schemaId: schema.name,
                  workspaceId: wsState.workspaceId,
                  metadata: {
                    type: TabViewType.ViewDetail,
                    tableName: view.name,
                    virtualTableId: view.oid,
                  },
                });
                await tabViewsStore.selectTab(tabId);
              },
            };
          })
      );
    },
  };
}
