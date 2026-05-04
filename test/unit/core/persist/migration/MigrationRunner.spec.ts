import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Migration } from '~/core/persist/migration/MigrationInterface';
import { executeMigrations } from '~/core/persist/migration/MigrationRunner';
// ── Import the mocked storage so tests can reset its internal state ────

import { migrationStateStorage } from '~/core/storage/entities/MigrationStateStorage';

// ── Mock migrationStateStorage so no real IDB / localforage is needed ──

vi.mock('~/core/storage/entities/MigrationStateStorage', () => {
  const store = new Map<string, string[]>();
  const migrationStateStorage = {
    get: vi.fn(async () => {
      const names = store.get('applied');
      return names ? { id: 'applied-migrations', names } : null;
    }),
    save: vi.fn(async (names: string[]) => {
      store.set('applied', names);
    }),
    clear: vi.fn(async () => store.clear()),
    _store: store, // exposed so tests can reset between runs
  };
  return { migrationStateStorage };
});

// ── FakeMigration helper ──────────────────────────────────────────────

function makeMigration(name: string, upImpl?: () => Promise<void>): Migration {
  return {
    name,
    up: upImpl ?? vi.fn().mockResolvedValue(undefined),
    down: vi.fn().mockResolvedValue(undefined),
  } as unknown as Migration;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('executeMigrations', () => {
  beforeEach(() => {
    vi.mocked(migrationStateStorage.get).mockClear();
    vi.mocked(migrationStateStorage.save).mockClear();
    // Reset the in-memory store between tests
    (migrationStateStorage as any)._store?.clear();
    vi.mocked(migrationStateStorage.get).mockImplementation(async () => {
      const names = (migrationStateStorage as any)._store?.get('applied');
      return names ? { id: 'applied-migrations', names } : null;
    });
    vi.mocked(migrationStateStorage.save).mockImplementation(
      async (names: string[]) => {
        (migrationStateStorage as any)._store?.set('applied', names);
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('(1) runs all pending migrations and calls up() in name-sorted order', async () => {
    const order: string[] = [];

    const mB = makeMigration('Migration_B', async () => {
      order.push('B');
    });
    const mA = makeMigration('Migration_A', async () => {
      order.push('A');
    });
    const mC = makeMigration('Migration_C', async () => {
      order.push('C');
    });

    await executeMigrations([mB, mA, mC]);

    expect(order).toEqual(['A', 'B', 'C']);
  });

  it('(2) applied names are persisted via storage after a run', async () => {
    const mA = makeMigration('Migration_A');
    const mB = makeMigration('Migration_B');

    await executeMigrations([mA, mB]);

    expect(migrationStateStorage.save).toHaveBeenLastCalledWith(
      expect.arrayContaining(['Migration_A', 'Migration_B'])
    );
  });

  it('(3) calling executeMigrations again skips all already-applied migrations', async () => {
    const mA = makeMigration('Migration_A');
    const mB = makeMigration('Migration_B');

    await executeMigrations([mA, mB]);

    vi.mocked(mA.up).mockClear();
    vi.mocked(mB.up).mockClear();

    await executeMigrations([mA, mB]);

    expect(mA.up).not.toHaveBeenCalled();
    expect(mB.up).not.toHaveBeenCalled();
  });

  it('(4) if up() rejects, the migration name is NOT added to the applied list', async () => {
    const failing = makeMigration('Migration_Fail', async () => {
      throw new Error('migration failed');
    });

    await expect(executeMigrations([failing])).rejects.toThrow(
      'migration failed'
    );

    // save should not have been called with the failing migration's name
    const savedCalls = vi.mocked(migrationStateStorage.save).mock.calls;
    const allSavedNames = savedCalls.flatMap(([names]) => names);
    expect(allSavedNames).not.toContain('Migration_Fail');
  });

  it('(5) onStep callback is called once per migration with the correct name', async () => {
    const mA = makeMigration('Migration_A');
    const mB = makeMigration('Migration_B');
    const onStep = vi.fn();

    await executeMigrations([mA, mB], { onStep });

    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep).toHaveBeenCalledWith('Migration_A');
    expect(onStep).toHaveBeenCalledWith('Migration_B');
  });

  it('(6) partially applied state: only unapplied subset runs on second call', async () => {
    const mA = makeMigration('Migration_A');
    const mB = makeMigration('Migration_B');

    await executeMigrations([mA]);

    await executeMigrations([mA, mB]);

    expect(vi.mocked(mA.up)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mB.up)).toHaveBeenCalledTimes(1);
  });
});
