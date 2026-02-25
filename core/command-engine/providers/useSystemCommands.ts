import { useAppContext } from '~/core/contexts/useAppContext';
import { useSettingsModal } from '~/core/contexts/useSettingsModal';
import type { CommandItem, CommandProvider } from '../commandEngine.types';

const PREFIX = {
  key: '>',
  label: 'Commands',
  placeholder: 'Run a command...',
  icon: 'lucide:terminal',
} as const;

export function useSystemCommands(): CommandProvider {
  const settingsModal = useSettingsModal();
  const { connectToConnection, wsStateStore } = useAppContext();

  /** Static system commands */
  const staticCommands: Omit<CommandItem, 'execute'>[] = [
    {
      id: 'cmd-settings-editor',
      label: 'Settings: Editor',
      icon: 'lucide:scroll-text',
      group: 'Commands',
    },
    {
      id: 'cmd-settings-quick-query',
      label: 'Settings: Quick Query',
      icon: 'lucide:table-2',
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
      icon: 'lucide:refresh-cw',
      group: 'Commands',
    },
    {
      id: 'cmd-close-app',
      label: 'Close App',
      icon: 'lucide:power',
      group: 'Commands',
    },
  ];

  const buildExecutors = (): Map<string, () => void | Promise<void>> => {
    const map = new Map<string, () => void | Promise<void>>();

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
