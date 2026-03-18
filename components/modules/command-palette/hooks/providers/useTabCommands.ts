import { useTabViewsStore } from '~/core/stores/useTabViewsStore';
import type {
  CommandItem,
  CommandProvider,
} from '../../types/commandEngine.types';

const PREFIX = {
  key: 'tab:',
  label: 'Tabs',
  placeholder: 'Switch to open tab...',
  icon: 'hugeicons:browser',
} as const;

export function useTabCommands(): CommandProvider {
  const tabViewsStore = useTabViewsStore();

  return {
    prefix: PREFIX,
    includeInGlobal: false,
    resolve(query: string): CommandItem[] {
      const lowerQuery = query.toLowerCase();
      const activeId = tabViewsStore.activeTab?.id;

      return tabViewsStore.tabViews
        .filter(tab => tab.id !== activeId)
        .filter(
          tab => !lowerQuery || tab.name.toLowerCase().includes(lowerQuery)
        )
        .map(tab => ({
          id: `tab-${tab.id}`,
          label: tab.name,
          icon: tab.icon || 'hugeicons:file-02',
          iconClass: tab.iconClass,
          group: 'Open Tabs',
          execute: async () => {
            await tabViewsStore.selectTab(tab.id);
          },
        }));
    },
  };
}
