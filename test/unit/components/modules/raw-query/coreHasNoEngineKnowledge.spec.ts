import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CORE_ROOT = join(process.cwd(), 'components/modules/raw-query');

/** Every .ts and .vue file under the core, relative to CORE_ROOT. */
const coreSourceFiles = (): string[] =>
  readdirSync(CORE_ROOT, { recursive: true, encoding: 'utf8' }).filter(
    entry => entry.endsWith('.ts') || entry.endsWith('.vue')
  );

const readCoreFile = (relativePath: string): string =>
  readFileSync(join(CORE_ROOT, relativePath), 'utf8');

describe('raw-query core', () => {
  it('never imports DatabaseClientType as a value', () => {
    const offenders = coreSourceFiles().filter(file =>
      /^import\s+\{[^}]*\bDatabaseClientType\b/m.test(readCoreFile(file))
    );

    expect(offenders).toEqual([]);
  });

  it('never names a specific engine in a conditional', () => {
    const offenders = coreSourceFiles().filter(file =>
      /DatabaseClientType\.[A-Z0-9_]+/.test(readCoreFile(file))
    );

    expect(offenders).toEqual([]);
  });

  it('never imports from the driver layer', () => {
    const offenders = coreSourceFiles().filter(file =>
      /from\s+'[^']*components\/modules\/driver\//.test(readCoreFile(file))
    );

    expect(offenders).toEqual([]);
  });
});
