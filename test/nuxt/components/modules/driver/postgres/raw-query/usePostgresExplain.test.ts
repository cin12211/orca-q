import { describe, expect, it, vi } from 'vitest';
import { ContextMenuItemType } from '~/components/base/context-menu/menuContext.type';
import { usePostgresExplain } from '~/components/modules/driver/postgres/raw-query/hooks';
import { postgresExplainExecutor } from '~/components/modules/driver/postgres/raw-query/services';
import { ViewMode } from '~/components/modules/raw-query/interfaces';

// Partial mock: the capabilities module also pulls completions from here.
vi.mock('~/components/base/code-editor/utils', async importOriginal => ({
  ...(await importOriginal<
    typeof import('~/components/base/code-editor/utils')
  >()),
  getCurrentStatement: () => ({
    currentStatements: [{ text: 'SELECT 1', from: 0, to: 8 }],
  }),
}));

const DEFAULT_PREFIX =
  'EXPLAIN (ANALYZE, FORMAT JSON, BUFFERS, COSTS, SETTINGS, SUMMARY, TIMING, VERBOSE, WAL)';

const createExplain = (executeCurrentStatement = vi.fn()) => ({
  executeCurrentStatement,
  explain: usePostgresExplain({
    executeCurrentStatement,
    getEditorView: () => ({}) as never,
  }),
});

describe('usePostgresExplain', () => {
  it('runs the statement with the EXPLAIN prefix, executor and view', () => {
    const { executeCurrentStatement, explain } = createExplain();

    explain.runExplain();

    expect(executeCurrentStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        queryPrefix: expect.stringContaining('EXPLAIN ('),
        executor: postgresExplainExecutor,
        resultView: ViewMode.EXPLAIN,
      })
    );
  });

  it('builds the default prefix with every option enabled', () => {
    const { executeCurrentStatement, explain } = createExplain();

    explain.runExplain();

    expect(executeCurrentStatement.mock.calls[0][0].queryPrefix).toBe(
      DEFAULT_PREFIX
    );
  });

  it('drops an option from the prefix when it is toggled off', () => {
    const { executeCurrentStatement, explain } = createExplain();

    explain.toggleOption('BUFFERS');
    explain.runExplain();

    const prefix = executeCurrentStatement.mock.calls[0][0].queryPrefix;
    expect(prefix).not.toContain('BUFFERS');
    expect(prefix).toContain('ANALYZE');
  });

  it('adds the serialize option to the prefix', () => {
    const { executeCurrentStatement, explain } = createExplain();

    explain.setSerializeMode('TEXT');
    explain.runExplain();

    expect(executeCurrentStatement.mock.calls[0][0].queryPrefix).toContain(
      'SERIALIZE TEXT'
    );
  });

  it('exposes the toggleable option items without SERIALIZE', () => {
    const { explain } = createExplain();

    expect(explain.optionItems.value.map(item => item.key)).not.toContain(
      'SERIALIZE'
    );
    expect(
      explain.optionItems.value.find(item => item.key === 'BUFFERS')?.checked
    ).toBe(true);
  });

  it('contributes the Mod-e keybinding', () => {
    const { explain } = createExplain();

    expect(explain.explainKeymap.some(binding => binding.key === 'Mod-e')).toBe(
      true
    );
  });

  it('contributes the Analyze Query context-menu item', () => {
    const { executeCurrentStatement, explain } = createExplain();

    expect(explain.explainContextMenuItems).toHaveLength(1);

    const item = explain.explainContextMenuItems[0];

    expect(item.type).toBe(ContextMenuItemType.ACTION);
    expect(item.title).toBe('Analyze Query');
    expect(item.icon).toBe('hugeicons:analytics-01');
    expect(item.shortcut).toBe('⌘E');

    item.select?.();

    expect(executeCurrentStatement).toHaveBeenCalledTimes(1);
  });
});
