// Types & Enums
export type { EnvironmentTag } from './types/environmentTag.types';
export { TagColor } from './types/environmentTag.enums';

// Constants
export { DEFAULT_ENV_TAGS } from './constants/DEFAULT_ENV_TAGS';
export {
  TAG_COLOR_OPTIONS,
  TAG_COLOR_MAP,
  type TagColorOption,
} from './constants/TAG_COLOR_OPTIONS';

// Store (hook)
export { useEnvironmentTagStore } from './hooks/useEnvironmentTagStore';

// Guard hook + state (for root app wiring)
export {
  useStrictModeGuard,
  useStrictModeGuardState,
} from './hooks/useStrictModeGuard';

// Components
export { default as EnvTagColorDot } from './components/EnvTagColorDot.vue';
export { default as EnvTagBadge } from './components/EnvTagBadge.vue';
export { default as CreateEnvTagDialog } from './components/CreateEnvTagDialog.vue';
export { default as EnvTagPicker } from './components/EnvTagPicker.vue';
export { default as StrictModeConfirmDialog } from './components/StrictModeConfirmDialog.vue';

// Containers
export { default as TagManagementContainer } from './containers/TagManagementContainer.vue';
