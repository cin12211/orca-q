import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useElectronUpdater } from '~/core/composables/useElectronUpdater';
import ElectronUpdateIndicator from './ElectronUpdateIndicator.vue';

const pinia = createPinia();
setActivePinia(pinia);

const readyUpdate = {
  version: '1.2.0',
  currentVersion: '1.1.6',
  releaseDate: '2026-05-25T09:00:00.000Z',
  releaseNotes: 'Downloaded in the background and ready to apply.',
};

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
    updater: {
      check: async () => ({
        status: 'ready' as const,
        updateInfo: readyUpdate,
      }),
      download: async () => undefined,
      install: async () => undefined,
      onUpdateAvailable: () => () => undefined,
      onUpToDate: () => () => undefined,
      onProgress: () => () => undefined,
      onReady: cb => {
        queueMicrotask(() => cb(readyUpdate));
        return () => undefined;
      },
      onError: () => () => undefined,
    },
    window: {
      minimize: async () => undefined,
      maximize: async () => undefined,
      close: async () => undefined,
      pickSqliteFile: async () => null,
      pickSaveFile: async () => null,
      pickDirectory: async () => null,
      writeFile: async () => undefined,
      openPath: async () => '',
      getStoragePath: async () => '',
      openStoragePath: async () => undefined,
      getLogPath: async () => '',
      openLogFile: async () => undefined,
      resetAllData: async () => undefined,
      onOpenSettings: () => () => undefined,
    },
  };
};

const resetUpdaterState = (updater: ReturnType<typeof useElectronUpdater>) => {
  updater.isSupported.value = true;
  updater.status.value = 'idle';
  updater.availableUpdate.value = null;
  updater.readyToRestartUpdate.value = null;
  updater.downloadProgress.value = 0;
  updater.isDownloadStalled.value = false;
  updater.downloadTotalBytes.value = null;
  updater.downloadedBytes.value = null;
  updater.lastError.value = null;
  updater.isChecking.value = false;
  updater.isDownloading.value = false;
};

const meta = {
  title: 'Modules/App Shell/ElectronUpdateIndicator',
  component: ElectronUpdateIndicator,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (_, context) => {
      installElectronMock();
      if (context.name === 'Overview') {
        return {
          components: { TooltipProvider },
          template:
            '<TooltipProvider><div class="w-full max-w-4xl p-6 bg-background rounded-xl text-foreground"><story /></div></TooltipProvider>',
        };
      }
      return {
        components: { TooltipProvider },
        template:
          '<TooltipProvider><div class="h-6 min-w-[360px] bg-sidebar-accent px-3 flex items-center justify-end"><story /></div></TooltipProvider>',
      };
    },
  ],
} satisfies Meta<typeof ElectronUpdateIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => ({
    components: { ElectronUpdateIndicator },
    setup() {
      const updater = useElectronUpdater();

      const states = [
        {
          name: 'Ready to Apply',
          description: 'Downloaded in the background and ready to restart.',
          setup: () => {
            resetUpdaterState(updater);
            updater.status.value = 'ready-to-restart';
            updater.readyToRestartUpdate.value = {
              version: '1.2.0',
              currentVersion: '1.1.6',
              date: '2026-05-25T09:00:00.000Z',
              body: 'This update includes major performance improvements and bug fixes.',
            };
          },
        },
        {
          name: 'Update Available',
          description: 'A new update is available. Prompts to download.',
          setup: () => {
            resetUpdaterState(updater);
            updater.status.value = 'available';
            updater.availableUpdate.value = {
              version: '1.2.0',
              currentVersion: '1.1.6',
              date: '2026-05-25T09:00:00.000Z',
              body: 'A new version of HeraQ is available with a brand new interface, improved erd-diagrams, and optimized SQLite querying speed.',
            };
          },
        },
        {
          name: 'Downloading (45%)',
          description:
            'Download is actively in progress with status percentage.',
          setup: () => {
            resetUpdaterState(updater);
            updater.status.value = 'downloading';
            updater.isDownloading.value = true;
            updater.downloadProgress.value = 45;
            updater.downloadedBytes.value = 45000000;
            updater.downloadTotalBytes.value = 100000000;
            updater.availableUpdate.value = {
              version: '1.2.0',
              currentVersion: '1.1.6',
              date: '2026-05-25T09:00:00.000Z',
              body: 'A new version of HeraQ is available with a brand new interface, improved erd-diagrams, and optimized SQLite querying speed.',
            };
          },
        },
        {
          name: 'Download Stalled',
          description: 'Stalled download with alert and cancel/retry options.',
          setup: () => {
            resetUpdaterState(updater);
            updater.status.value = 'downloading';
            updater.isDownloading.value = true;
            updater.isDownloadStalled.value = true;
            updater.downloadProgress.value = 68;
            updater.downloadedBytes.value = 68000000;
            updater.downloadTotalBytes.value = 100000000;
            updater.availableUpdate.value = {
              version: '1.2.0',
              currentVersion: '1.1.6',
              date: '2026-05-25T09:00:00.000Z',
              body: 'A new version of HeraQ is available with a brand new interface, improved erd-diagrams, and optimized SQLite querying speed.',
            };
          },
        },
        {
          name: 'Download Error',
          description: 'Error state displaying connection or server issues.',
          setup: () => {
            resetUpdaterState(updater);
            updater.status.value = 'error';
            updater.lastError.value =
              'Network connection lost. Please check your internet connectivity.';
            updater.availableUpdate.value = {
              version: '1.2.0',
              currentVersion: '1.1.6',
              date: '2026-05-25T09:00:00.000Z',
              body: 'A new version of HeraQ is available with a brand new interface, improved erd-diagrams, and optimized SQLite querying speed.',
            };
          },
        },
      ];

      const activeIndex = ref(0);

      // Initialize with the first state
      states[0].setup();

      const selectState = (index: number) => {
        activeIndex.value = index;
        states[index].setup();
      };

      return {
        states,
        activeIndex,
        selectState,
      };
    },
    template: `
      <div class="flex flex-col gap-6 w-full max-w-3xl p-6 bg-background rounded-xl border border-border shadow-md text-foreground">
        <!-- Story Header -->
        <div class="flex flex-col gap-1 border-b border-border pb-4">
          <h1 class="text-xl font-bold tracking-tight">Electron Update Indicator Overview</h1>
          <p class="text-sm text-muted-foreground">
            Since the updater uses a shared module-level state, only one active state can be simulated at a time. 
            Use the controller below to select and preview each update status.
          </p>
        </div>

        <!-- Interactive State Controller -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            v-for="(s, index) in states"
            :key="index"
            @click="selectState(index)"
            class="flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer select-none text-xs"
            :class="activeIndex === index 
              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20 scale-[1.02] font-semibold text-primary' 
              : 'hover:bg-muted/50 border-input text-muted-foreground'"
          >
            <span>{{ s.name }}</span>
          </button>
        </div>

        <!-- Info & Live Preview Area -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-5 rounded-lg border border-border">
          <div class="flex flex-col gap-2 justify-between">
            <div class="flex flex-col gap-1">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">State Details</span>
              <p class="text-sm font-bold text-foreground">{{ states[activeIndex].name }}</p>
              <p class="text-xs text-muted-foreground mt-1">{{ states[activeIndex].description }}</p>
            </div>
            <div class="pt-3 border-t border-border/60 text-[11px] text-muted-foreground italic flex items-center gap-1.5">
              <span>💡</span> Click the indicator on the right to trigger action popovers / actions.
            </div>
          </div>

          <div class="flex flex-col gap-2 justify-center">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live Indicator</span>
            <div class="h-10 w-full bg-sidebar-accent px-4 flex items-center justify-end rounded-md border border-border/80 shadow-inner">
              <ElectronUpdateIndicator />
            </div>
          </div>
        </div>
      </div>
    `,
  }),
};

export const ReadyToApply: Story = {
  render: () => ({
    components: { ElectronUpdateIndicator },
    setup() {
      const updater = useElectronUpdater();
      resetUpdaterState(updater);
      updater.status.value = 'ready-to-restart';
      updater.readyToRestartUpdate.value = {
        version: '1.2.0',
        currentVersion: '1.1.6',
        date: '2026-05-25T09:00:00.000Z',
        body: 'This update includes major performance improvements and bug fixes.',
      };
      return {};
    },
    template: '<ElectronUpdateIndicator />',
  }),
};

export const Available: Story = {
  render: () => ({
    components: { ElectronUpdateIndicator },
    setup() {
      const updater = useElectronUpdater();
      resetUpdaterState(updater);
      updater.status.value = 'available';
      updater.availableUpdate.value = {
        version: '1.2.0',
        currentVersion: '1.1.6',
        date: '2026-05-25T09:00:00.000Z',
        body: 'A new version of HeraQ is available with a brand new interface, improved erd-diagrams, and optimized SQLite querying speed.',
      };
      return {};
    },
    template: '<ElectronUpdateIndicator />',
  }),
};

export const Downloading: Story = {
  render: () => ({
    components: { ElectronUpdateIndicator },
    setup() {
      const updater = useElectronUpdater();
      resetUpdaterState(updater);
      updater.status.value = 'downloading';
      updater.isDownloading.value = true;
      updater.downloadProgress.value = 45;
      updater.downloadedBytes.value = 45000000;
      updater.downloadTotalBytes.value = 100000000;
      updater.availableUpdate.value = {
        version: '1.2.0',
        currentVersion: '1.1.6',
        date: '2026-05-25T09:00:00.000Z',
        body: 'A new version of HeraQ is available with a brand new interface, improved erd-diagrams, and optimized SQLite querying speed.',
      };
      return {};
    },
    template: '<ElectronUpdateIndicator />',
  }),
};

export const Stalled: Story = {
  render: () => ({
    components: { ElectronUpdateIndicator },
    setup() {
      const updater = useElectronUpdater();
      resetUpdaterState(updater);
      updater.status.value = 'downloading';
      updater.isDownloading.value = true;
      updater.isDownloadStalled.value = true;
      updater.downloadProgress.value = 68;
      updater.downloadedBytes.value = 68000000;
      updater.downloadTotalBytes.value = 100000000;
      updater.availableUpdate.value = {
        version: '1.2.0',
        currentVersion: '1.1.6',
        date: '2026-05-25T09:00:00.000Z',
        body: 'A new version of HeraQ is available with a brand new interface, improved erd-diagrams, and optimized SQLite querying speed.',
      };
      return {};
    },
    template: '<ElectronUpdateIndicator />',
  }),
};

export const Error: Story = {
  render: () => ({
    components: { ElectronUpdateIndicator },
    setup() {
      const updater = useElectronUpdater();
      resetUpdaterState(updater);
      updater.status.value = 'error';
      updater.lastError.value =
        'Network connection lost. Please check your internet connectivity.';
      updater.availableUpdate.value = {
        version: '1.2.0',
        currentVersion: '1.1.6',
        date: '2026-05-25T09:00:00.000Z',
        body: 'A new version of HeraQ is available with a brand new interface, improved erd-diagrams, and optimized SQLite querying speed.',
      };
      return {};
    },
    template: '<ElectronUpdateIndicator />',
  }),
};
