import { computed, ref } from 'vue';
import type { MigrationStepInfo } from '../persist/migration';

export type MigrationPhase = 'pending' | 'running' | 'done' | 'error';

export interface MigrationState {
  phase: MigrationPhase;
  currentStep: MigrationStepInfo | null;
  appliedCount: number;
  error: string | null;
}

/**
 * Module-level singleton — shared across the Nuxt plugin (writer)
 * and all component instances (MigrationScreen reader) within the SPA.
 */
const _state = ref<MigrationState>({
  phase: 'pending',
  currentStep: null,
  appliedCount: 0,
  error: null,
});

/**
 * Global migration progress state.
 *
 * The plugin (`01.migration.client.ts`) writes to this state while migrations run.
 * `MigrationScreen.vue` reads it and shows a blocking overlay until phase is `done`.
 */
export function useMigrationState() {
  const start = () => {
    _state.value = {
      phase: 'running',
      currentStep: null,
      appliedCount: 0,
      error: null,
    };
  };

  const progress = (step: MigrationStepInfo) => {
    _state.value = {
      ..._state.value,
      phase: 'running',
      currentStep: step,
      appliedCount: _state.value.appliedCount + 1,
    };
  };

  const done = () => {
    _state.value = { ..._state.value, phase: 'done', currentStep: null };
  };

  const fail = (message: string) => {
    _state.value = { ..._state.value, phase: 'error', error: message };
  };

  const isBlocking = computed(
    () => _state.value.phase === 'pending' || _state.value.phase === 'running'
  );

  return { state: _state, isBlocking, start, progress, done, fail };
}
