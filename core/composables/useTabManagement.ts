import type { RouteNameFromPath, RoutePathSchema } from '@typed-router/__paths';
import { useAppContext } from '~/core/contexts/useAppContext';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import { useWSStateStore } from '~/core/stores/useWSStateStore';

export interface OpenTabOptions {
  id: string;
  name: string;
  icon?: string;
  iconClass?: string;
  type: TabViewType;
  routeName: RouteNameFromPath<RoutePathSchema>;
  routeParams?: Record<string, any>;
  metadata?: any;
}

export const useTabManagement = () => {
  const tabViewStore = useTabViewsStore();
  const wsStateStore = useWSStateStore();
  const { connectionStore } = useAppContext();
  const { workspaceId, connectionId, schemaId } = toRefs(wsStateStore);

  const openTab = async (options: OpenTabOptions) => {
    if (!workspaceId.value || !connectionId.value) {
      return;
    }

    await tabViewStore.openTab({
      icon: options.icon || 'hugeicons:grid-table',
      iconClass: options.iconClass,
      id: options.id,
      name: options.name,
      type: options.type,
      routeName: options.routeName,
      routeParams: {
        ...options.routeParams,
        workspaceId: workspaceId.value,
        connectionId: connectionId.value,
      },
      connectionId: connectionId.value,
      schemaId: schemaId.value || '',
      workspaceId: workspaceId.value,
      metadata: {
        ...options.metadata,
        type: options.type,
      },
    });

    await tabViewStore.selectTab(options.id);
  };

  const openCodeQueryTab = async (params: {
    id: string;
    name: string;
    icon?: string;
  }) => {
    await openTab({
      id: params.id,
      name: params.name,
      icon: params.icon || 'lucide:file',
      type: TabViewType.CodeQuery,
      routeName: 'workspaceId-connectionId-explorer-fileId',
      routeParams: {
        fileId: params.id,
      },
      metadata: {
        tableName: params.name,
        treeNodeId: params.id,
      },
    });
  };

  const openSchemaItemTab = async (params: {
    id: string;
    name: string;
    type: TabViewType;
    icon?: string;
    iconClass?: string;
    itemValueId?: string | number;
    treeNodeId?: string;
  }) => {
    const tabId = `${params.name}-${schemaId.value}`;
    const virtualTableId =
      params.type === TabViewType.ViewDetail
        ? String(params.itemValueId ?? params.treeNodeId ?? '')
        : undefined;

    await openTab({
      id: tabId,
      name: params.name,
      icon: params.icon,
      iconClass: params.iconClass,
      type: params.type,
      routeName: 'workspaceId-connectionId-quick-query-tabViewId',
      routeParams: {
        tabViewId: tabId,
      },
      metadata: {
        tableName: params.name,
        virtualTableId,
        functionId: String(params.itemValueId || ''),
        treeNodeId: params.treeNodeId,
      },
    });
  };

  const openUserPermissionsTab = async (params: {
    roleName: string;
    icon?: string;
    iconClass?: string;
    treeNodeId?: string;
  }) => {
    const tabId = `user-permissions-${params.roleName}`;

    await openTab({
      id: tabId,
      name: `${params.roleName} Permissions`,
      icon: params.icon || 'hugeicons:user-circle',
      iconClass: params.iconClass,
      type: TabViewType.UserPermissions,
      routeName: 'workspaceId-connectionId-user-permissions-roleName',
      routeParams: {
        roleName: params.roleName,
      },
      metadata: {
        roleName: params.roleName,
        treeNodeId: params.treeNodeId,
      },
    });
  };

  const openInstanceInsightsTab = async (params?: {
    databaseName?: string;
  }) => {
    if (!workspaceId.value || !connectionId.value) return;

    const selectedConnection = connectionStore.connections.find(
      c => c.id === connectionId.value
    );

    const databaseName =
      params?.databaseName ||
      selectedConnection?.database ||
      selectedConnection?.name ||
      'Instance Insights';

    const tabId = `instance-insights-${connectionId.value}`;

    await openTab({
      id: tabId,
      name: `${databaseName} - Insights`,
      icon: 'hugeicons:activity-02',
      iconClass: 'text-primary',
      type: TabViewType.InstanceInsights,
      routeName: 'workspaceId-connectionId-instance-insights',
      routeParams: {
        workspaceId: workspaceId.value,
        connectionId: connectionId.value,
      },
      metadata: {
        type: TabViewType.InstanceInsights,
      },
    });
  };

  const openDatabaseToolsTab = async (params: {
    type: 'export' | 'import';
    databaseName: string;
  }) => {
    if (!workspaceId.value || !connectionId.value) return;

    const tabId = `database-tools-${connectionId.value}`;
    // await openTab({
    //   id: tabId,
    //   name: `${params.databaseName} - Tools`,
    //   icon: 'hugeicons:wrench',
    //   type: TabViewType.DatabaseTools,
    //   routeName: 'workspaceId-connectionId-management-export',
    //   routeParams: {
    //     name: params.type,
    //   },
    // });
  };

  return {
    openTab,
    openCodeQueryTab,
    openSchemaItemTab,
    openUserPermissionsTab,
    openInstanceInsightsTab,
    openDatabaseToolsTab,
  };
};
