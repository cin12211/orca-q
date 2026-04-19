import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Migration } from '~/core/persist/migration/MigrationInterface';
import { executeMigrations } from '~/core/persist/migration/MigrationRunner';

// ── In-memory localStorage stub ───────────────────────────────────────

function createFakeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  };
}

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
  let fakeStorage: ReturnType<typeof createFakeLocalStorage>;

  beforeEach(() => {
    fakeStorage = createFakeLocalStorage();
    vi.stubGlobal('localStorage', fakeStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it('(2) applied names are serialised to localStorage after a run', async () => {
    const mA = makeMigration('Migration_A');
    const mB = makeMigration('Migration_B');

    await executeMigrations([mA, mB]);

    const raw = fakeStorage.getItem('orcaq-applied-migrations-v1');
    expect(raw).not.toBeNull();
    const applied = JSON.parse(raw!) as string[];
    expect(applied).toContain('Migration_A');
    expect(applied).toContain('Migration_B');
  });

  it('(3) calling executeMigrations again skips all already-applied migrations', async () => {
    const mA = makeMigration('Migration_A');
    const mB = makeMigration('Migration_B');

    await executeMigrations([mA, mB]);

    // Reset spy call counts
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

    const raw = fakeStorage.getItem('orcaq-applied-migrations-v1');
    const applied: string[] = raw ? JSON.parse(raw) : [];
    expect(applied).not.toContain('Migration_Fail');
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

    // First run: only mA
    await executeMigrations([mA]);

    // Second run: both, but mA is already applied
    await executeMigrations([mA, mB]);

    expect(vi.mocked(mA.up)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(mB.up)).toHaveBeenCalledTimes(1);
  });
});
