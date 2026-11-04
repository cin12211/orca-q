import { describe, expect, it } from 'vitest';
import {
  createDefaultAppConfigState,
  normalizeAppConfigState,
} from '~/core/persist/normalize';

describe('normalizeAppConfigState: MCP server settings', () => {
  it('keeps the MCP server switch through a save/load round trip', () => {
    const saved = normalizeAppConfigState({
      ...createDefaultAppConfigState(),
      mcpServerConfigs: { enabled: true },
    });

    // Electron persists the config as JSON text in SQLite.
    const loaded = normalizeAppConfigState(JSON.parse(JSON.stringify(saved)));

    expect(loaded.mcpServerConfigs).toEqual({ enabled: true });
  });

  it('defaults to a disabled server', () => {
    expect(normalizeAppConfigState({}).mcpServerConfigs).toEqual({
      enabled: false,
    });
  });
});
