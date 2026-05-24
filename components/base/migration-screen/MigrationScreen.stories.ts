import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import { useMigrationState } from '../../../core/composables/useMigrationState';
import MigrationScreen from './MigrationScreen.vue';

const meta = {
  title: 'Base/MigrationScreen',
  component: MigrationScreen,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### MigrationScreen Component

A full-screen, blocking transition overlay shown during database migrations or app boot. It reads from the global \\\`useMigrationState\\\` singleton to dynamically render progress and update states.

- **Global Singleton Integration**: Reflects real-time updates from \\\`useMigrationState\\\`.
- **States**: Supports \\\`pending\\\` (booting), \\\`running\\\` (migrating collections), \\\`done\\\` (fades out), and \\\`error\\\` (failing).
- **Design**: Premium glassmorphic backdrop, smooth spin loader, precise update counters, and a clean fade transition.
`,
      },
    },
  },
} satisfies Meta<typeof MigrationScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Interactive Demo: Test the full migration lifecycle interactively.
 * Use the control panel below to trigger state transitions and watch how the screen fades in and out!
 */
export const InteractiveLifecycle: Story = {
  render: () => ({
    components: { MigrationScreen },
    setup() {
      const { state, start, progress, done, fail } = useMigrationState();

      const collections = [
        'users',
        'connections',
        'queries',
        'settings',
        'history',
      ];
      let collectionIndex = 0;

      const handleStart = () => {
        start();
      };

      const handleNextStep = () => {
        if (state.value.phase !== 'running') {
          start();
        }
        const collection = collections[collectionIndex % collections.length];
        collectionIndex++;
        progress({
          collection,
          version: state.value.appliedCount + 1,
          description: `Migrating ${collection} schema to latest version`,
        });
      };

      const handleFail = () => {
        fail('Database connection timeout. Failed to acquire migration lock.');
      };

      const handleDone = () => {
        done();
      };

      // Reset the state to initial pending state on mount so it's visible initially
      state.value = {
        phase: 'pending',
        currentStep: null,
        appliedCount: 0,
        error: null,
      };

      return {
        state,
        handleStart,
        handleNextStep,
        handleFail,
        handleDone,
      };
    },
    template: `
      <div class="relative w-full h-[500px] border border-border rounded-lg overflow-hidden bg-slate-950 flex flex-col items-center justify-center p-6 storybook-migration-container">
        
        <!-- Background Mock App Content -->
        <div class="w-full h-full flex flex-col justify-between opacity-40 select-none pointer-events-none p-4">
          <div class="flex items-center justify-between border-b pb-2">
            <span class="font-bold text-sm">Dashboard Mock</span>
            <div class="flex gap-2">
              <span class="w-8 h-3 bg-muted rounded"></span>
              <span class="w-12 h-3 bg-muted rounded"></span>
            </div>
          </div>
          <div class="space-y-3 my-4">
            <div class="h-4 bg-muted rounded w-3/4"></div>
            <div class="h-4 bg-muted rounded w-5/6"></div>
            <div class="h-4 bg-muted rounded w-2/3"></div>
            <div class="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div class="h-8 bg-muted rounded"></div>
        </div>

        <!-- The actual migration screen overlay -->
        <MigrationScreen />

        <!-- Storybook absolute positioning patch & custom dashboard controller -->
        <style>
          .storybook-migration-container .fixed {
            position: absolute !important;
            z-index: 50 !important;
          }
        </style>

        <!-- Interactive Controller (always sits on top of everything inside Storybook preview) -->
        <div class="absolute bottom-4 left-4 right-4 z-[100] bg-zinc-900/90 backdrop-blur border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono text-zinc-400">Current Phase: <strong class="text-emerald-400">{{ state.phase.toUpperCase() }}</strong></span>
            <span class="text-xs font-mono text-zinc-400">Updates Applied: <strong class="text-emerald-400">{{ state.appliedCount }}</strong></span>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button 
              @click="handleStart" 
              class="px-2 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            >
              🔄 Trigger Start
            </button>
            <button 
              @click="handleNextStep" 
              class="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            >
              🚀 Apply Next Step
            </button>
            <button 
              @click="handleFail" 
              class="px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            >
              ⚠️ Fail Migration
            </button>
            <button 
              @click="handleDone" 
              class="px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs font-semibold cursor-pointer active:scale-95 transition-all"
            >
              ✅ Complete/Done
            </button>
          </div>
          <p class="text-[10px] text-zinc-500 text-center mt-1">Click Done to fade out and reveal mock dashboard. Click Start/Next to fade in.</p>
        </div>
      </div>
    `,
  }),
};
