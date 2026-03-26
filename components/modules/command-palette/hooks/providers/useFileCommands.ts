import { useWorkspaceConnectionRoute } from '~/core/composables/useWorkspaceConnectionRoute';
import { useExplorerFileStore } from '~/core/stores/useExplorerFileStore';
import { TabViewType, useTabViewsStore } from '~/core/stores/useTabViewsStore';
import type {
  CommandItem,
  CommandProvider,
} from '../../types/commandEngine.types';

/**
 * File provider has no user-facing prefix.
 * It participates in global (no-prefix) search only.
 * We use a hidden prefix key that users won't type.
 */
const PREFIX = {
  key: '__file__',
  label: 'Files',
  placeholder: 'Search files...',
  icon: 'hugeicons:document-code',
} as const;

export function useFileCommands(): CommandProvider {
  const explorerFileStore = useExplorerFileStore();
  const tabViewsStore = useTabViewsStore();
  const { workspaceId, connectionId } = useWorkspaceConnectionRoute();

  return {
    prefix: PREFIX,
    includeInGlobal: true,
    resolve(query: string): CommandItem[] {
      const lowerQuery = query.toLowerCase();

      return explorerFileStore.flatNodes
        .filter(node => !node.isFolder)
        .filter(
          node => !lowerQuery || node.title.toLowerCase().includes(lowerQuery)
        )
        .map(file => ({
          id: `file-${file.id}`,
          label: file.title,
          icon: file.icon || 'hugeicons:document-code',
          group: 'Files',
          execute: async () => {
            if (!connectionId.value || !workspaceId.value) return;

            await tabViewsStore.openTab({
              id: file.id,
              name: file.title,
              icon: file.icon || 'hugeicons:document-code',
              type: TabViewType.CodeQuery,
              routeName: 'workspaceId-connectionId-explorer-fileId',
              routeParams: { fileId: file.id },
              connectionId: connectionId.value,
              schemaId: '',
              workspaceId: workspaceId.value,
              metadata: {
                type: TabViewType.CodeQuery,
                tableName: file.title,
                treeNodeId: file.id,
              },
            });
            await tabViewsStore.selectTab(file.id);
          },
        }));
    },
  };
}
