import { useInstanceInsights } from '~/core/composables/useInstanceInsights';
import { useAppContext } from '~/core/contexts/useAppContext';
import { useChangelogModal } from '~/core/contexts/useChangelogModal';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';
import type {
  CommandItem,
  CommandProvider,
} from '../../types/commandEngine.types';

const PREFIX = {
  key: '>',
  label: 'Commands',
  placeholder: 'Run a command...',
  icon: 'hugeicons:computer-terminal-01',
} as const;

export function useSystemCommands(): CommandProvider {
  const settingsModal = useSettingsModal();
  const changelogModal = useChangelogModal();
  const { openInstanceInsights } = useInstanceInsights();

  const { connectToConnection, wsStateStore, tabViewStore, connectionStore } =
    useAppContext();

  /** Static system commands */
  const staticCommands: Omit<CommandItem, 'execute'>[] = [
    {
      id: 'cmd-settings-appearance',
      label: 'Settings: Appearance',
      icon: 'hugeicons:paint-brush-02',
      group: 'Commands',
    },
    {
      id: 'cmd-settings-editor',
      label: 'Settings: Editor',
      icon: 'hugeicons:file-management',
      group: 'Commands',
    },
    {
      id: 'cmd-settings-quick-query',
      label: 'Settings: Quick Query',
      icon: 'hugeicons:database-02',
      group: 'Commands',
    },
    {
      id: 'cmd-settings-agent',
      label: 'Settings: Agent',
      icon: 'hugeicons:chat-bot',
      group: 'Commands',
    },
    {
      id: 'cmd-reload-schema',
      label: 'Reload Schema',
      icon: 'hugeicons:redo',
      group: 'Commands',
    },
    {
      id: 'cmd-reload-app',
      label: 'Reload App',
      icon: 'hugeicons:refresh',
      group: 'Commands',
    },
    {
      id: 'cmd-close-app',
      label: 'Close App',
      icon: 'hugeicons:logout-circle-01',
      group: 'Commands',
    },
    {
      id: 'cmd-show-instance-insights',
      label: 'Instance Insights',
      icon: 'hugeicons:activity-02',
      group: 'Commands',
    },
    {
      id: 'cmd-open-whats-new',
      label: "What's New",
      icon: 'hugeicons:stars',
      group: 'Commands',
    },
  ];

  const buildExecutors = (): Map<string, () => void | Promise<void>> => {
    const map = new Map<string, () => void | Promise<void>>();

    map.set('cmd-settings-appearance', () =>
      settingsModal.openSettings('Appearance')
    );
    map.set('cmd-settings-editor', () => settingsModal.openSettings('Editor'));
    map.set('cmd-settings-quick-query', () =>
      settingsModal.openSettings('Quick Query')
    );
    map.set('cmd-settings-agent', () => settingsModal.openSettings('Agent'));
    map.set('cmd-reload-schema', async () => {
      const connId = wsStateStore.connectionId;
      const wsId = wsStateStore.workspaceId;
      if (!connId || !wsId) return;
      await connectToConnection({ connId, wsId, isRefresh: true });
    });
    map.set('cmd-reload-app', () => {
      window.location.reload();
    });
    map.set('cmd-close-app', () => {
      window.close();
    });
    map.set('cmd-show-instance-insights', async () => {
      await openInstanceInsights();
    });
    map.set('cmd-open-whats-new', () => {
      void changelogModal.openChangelog();
    });

    return map;
  };

  return {
    prefix: PREFIX,
    includeInGlobal: false,
    resolve(query: string): CommandItem[] {
      const lowerQuery = query.toLowerCase();
      const executors = buildExecutors();

      return staticCommands
        .filter(
          cmd => !lowerQuery || cmd.label.toLowerCase().includes(lowerQuery)
        )
        .map(cmd => ({
          ...cmd,
          execute: executors.get(cmd.id) || (() => {}),
        }));
    },
  };
}
