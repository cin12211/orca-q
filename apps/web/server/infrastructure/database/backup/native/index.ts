import { applyPlatformPathFallbacks } from './constants';

applyPlatformPathFallbacks();

export type { NativeBackupToolName } from '#shared/types';
export type {
  NativeBackupCapability,
  NativeBackupFormatOption,
} from './constants';
export * from './capability';
export * from './runtime';
