import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useSchemaStore } from '~/core/stores/useSchemaStore';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { FunctionSchemaEnum } from '~/core/types';
import type {
  CommandItem,
  CommandProvider,
} from '../../types/commandEngine.types';

const PREFIX = {
  key: 'f:',
  label: 'Functions',
  placeholder: 'Search functions...',
  icon: 'gravity-ui:function',
  iconClass: 'text-blue-400',
} as const;

export function useFunctionCommands(): CommandProvider {
  const schemaStore = useSchemaStore();
  const tabViewsStore = useTabViewsStore();
  const { workspaceId, connectionId } = useWorkspaceConnectionRoute();

  return {
    prefix: PREFIX,
    includeInGlobal: true,
    resolve(query: string): CommandItem[] {
      const lowerQuery = query.toLowerCase();

      return schemaStore.schemasByContext.flatMap(schema =>
        schema.functions
          .filter(
            fn => !lowerQuery || fn.name.toLowerCase().includes(lowerQuery)
          )
          .map(func => {
            const iconClass =
              func.type === FunctionSchemaEnum.Function
                ? 'text-blue-400'
                : 'text-orange-400';

            return {
              id: `func-${schema.name}-${func.oId}`,
              label: func.name,
              icon: 'gravity-ui:function',
              iconClass,
              group: 'Functions',
              description: schema.name,
              execute: async () => {
                const tabId = `${func.name}-${schema.name}`;
                await tabViewsStore.openTab({
                  id: tabId,
                  name: func.name,
                  icon: 'gravity-ui:function',
                  iconClass,
                  type: TabViewType.FunctionsDetail,
                  routeName: 'workspaceId-connectionId-quick-query-tabViewId',
                  routeParams: { tabViewId: tabId },
                  connectionId: connectionId.value,
                  schemaId: schema.name,
                  workspaceId: workspaceId.value,
                  metadata: {
                    type: TabViewType.FunctionsDetail,
                    tableName: func.name,
                    functionId: String(func.oId),
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
