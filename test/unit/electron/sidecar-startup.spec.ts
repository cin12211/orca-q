import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') {
        return '/mock/userData';
      }
      return '/mock/other';
    }),
  },
}));

vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: {
      ...actual,
      mkdirSync: vi.fn(),
    },
    mkdirSync: vi.fn(),
  };
});

describe('electron sidecar startup optimizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getSidecarCompileCacheDir resolves to <userData>/cc and creates directory', async () => {
    const { getSidecarCompileCacheDir } = await import(
      '~/electron/utils/sidecar'
    );
    const cacheDir = getSidecarCompileCacheDir();

    expect(cacheDir).toBe(path.join('/mock/userData', 'cc'));
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      path.join('/mock/userData', 'cc'),
      { recursive: true }
    );
  });

  it('verifies splash.html exists and contains the loading canvas and SVG', async () => {
    const actualFs = await vi.importActual<typeof import('node:fs')>('node:fs');
    const splashPath = path.resolve(__dirname, '../../../electron/splash.html');

    const content = actualFs.readFileSync(splashPath, 'utf8');

    expect(content).toContain('id="logo-svg"');
    expect(content).toContain('id="noise-canvas"');
    expect(content).toContain('prefers-color-scheme');
  });
});
