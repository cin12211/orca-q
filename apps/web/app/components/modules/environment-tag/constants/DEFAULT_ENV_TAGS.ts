import { TagColor } from '../types/environmentTag.enums';
import type { EnvironmentTag } from '../types/environmentTag.types';

export const DEFAULT_ENV_TAGS: EnvironmentTag[] = [
  {
    id: 'env-tag-prod',
    name: 'prod',
    color: TagColor.Red,
    strictMode: true,
    isSystem: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  },
  {
    id: 'env-tag-uat',
    name: 'uat',
    color: TagColor.Orange,
    strictMode: false,
    isSystem: true,
    createdAt: new Date('2024-01-01T00:00:01.000Z').toISOString(),
  },
  {
    id: 'env-tag-test',
    name: 'test',
    color: TagColor.Yellow,
    strictMode: false,
    isSystem: true,
    createdAt: new Date('2024-01-01T00:00:02.000Z').toISOString(),
  },
  {
    id: 'env-tag-dev',
    name: 'dev',
    color: TagColor.Blue,
    strictMode: false,
    isSystem: true,
    createdAt: new Date('2024-01-01T00:00:03.000Z').toISOString(),
  },
  {
    id: 'env-tag-local',
    name: 'local',
    color: TagColor.Green,
    strictMode: false,
    isSystem: true,
    createdAt: new Date('2024-01-01T00:00:04.000Z').toISOString(),
  },
];
