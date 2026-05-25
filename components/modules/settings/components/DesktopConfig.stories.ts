import { createPinia, setActivePinia } from 'pinia';
import type { Meta, StoryObj } from '@storybook/vue3';
import DesktopConfig from './DesktopConfig.vue';

const createUpdaterApi = () => ({
  check: async () => ({
    status: 'available' as const,
    updateInfo: {
      version: '1.2.0',
      currentVersion: '1.1.6',
      releaseDate: '2026-05-25T09:00:00.000Z',
      releaseNotes: 'Background download and clearer update status.',
    },
  }),
  download: async () => undefined,
  install: async () => undefined,
  onUpdateAvailable: () => () => undefined,
  onUpToDate: () => () => undefined,
  onProgress: () => () => undefined,
  onReady: () => () => undefined,
  onError: () => () => undefined,
});

const installElectronMock = () => {
  window.electronAPI = {
    persist: {
      getAll: async () => [],
      getOne: async () => null,
      find: async () => [],
      upsert: async (_, __, value) => value,
      delete: async () => [],
      replaceAll: async () => undefined,
      mergeAll: async () => undefined,
    },
    updater: createUpdaterApi(),
    window: {
      minimize: async () => undefined,
      maximize: async () => undefined,
      close: async () => undefined,
      pickSqliteFile: async () => null,
      getStoragePath: async () =>
        '/Users/cinny/Library/Application Support/orcaq',
      openStoragePath: async () => undefined,
      getLogPath: async () => '/Users/cinny/Library/Logs/orcaq/main.log',
      openLogFile: async () => undefined,
      resetAllData: async () => undefined,
      onOpenSettings: () => () => undefined,
    },
  };
};

const pinia = createPinia();
setActivePinia(pinia);

const meta = {
  title: 'Modules/Settings/DesktopConfig',
  component: DesktopConfig,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    () => {
      installElectronMock();
      return {
        template:
          '<div class="h-screen max-w-4xl bg-background p-6"><story /></div>',
      };
    },
  ],
} satisfies Meta<typeof DesktopConfig>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
