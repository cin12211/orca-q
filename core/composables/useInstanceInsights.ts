import { useAppContext } from '~/core/contexts/useAppContext';
import { TabViewType } from '~/core/stores';

export function useInstanceInsights() {
  const { tabViewStore, wsStateStore, connectionStore } = useAppContext();

  const openInstanceInsights = async () => {
    const { workspaceId, connectionId, schemaId } = wsStateStore;
    if (!workspaceId || !connectionId) return;

    const selectedConnection = connectionStore.connections.find(
      connection => connection.id === connectionId
    );
    const databaseName =
      selectedConnection?.database ||
      selectedConnection?.name ||
      'Instance Insights';
    const tabId = `instance-insights-${connectionId}`;

    await tabViewStore.openTab({
      workspaceId,
      connectionId,
      schemaId: schemaId || '',
      id: tabId,
      name: `${databaseName} - Insights`,
      icon: 'hugeicons:activity-02',
      iconClass: 'text-primary',
      type: TabViewType.InstanceInsights,
      routeName: 'workspaceId-connectionId-instance-insights',
      routeParams: {
        workspaceId,
        connectionId,
      },
      metadata: {
        type: TabViewType.InstanceInsights,
      },
    });

    await tabViewStore.selectTab(tabId);
  };

  return {
    openInstanceInsights,
  };
}
