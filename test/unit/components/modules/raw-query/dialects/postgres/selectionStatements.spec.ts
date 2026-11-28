/**
 * @vitest-environment happy-dom
 */
import { EditorView } from '@codemirror/view';
import { describe, expect, it } from 'vitest';
import { SQLDialectSupport } from '~/components/base/code-editor/constants';
import {
  sqlParserConfigField,
  updateSqlParserConfigEffect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import { getCurrentStatement } from '~/components/base/code-editor/utils/getCurrentStatement';
import { createTestState } from '../../helpers/test-editor-setup';

/**
 * A selection spanning several statements is what Raw Query runs as a
 * multi-statement batch: each `Statement` node becomes one run.
 */
describe('PostgreSQL statements in a selection', () => {
  const parserDialect = SQLDialectSupport.PostgreSQLParserDialect;

  const selectStatements = (sqlText: string, from: number, to: number) => {
    const { state } = createTestState(sqlText, parserDialect, [
      sqlParserConfigField,
    ]);
    const view = new EditorView({ state });
    view.dispatch({
      effects: updateSqlParserConfigEffect.of({
        dialect: parserDialect,
        isEnable: true,
        statementMode: 'sql',
      }),
      selection: { anchor: from, head: to },
    });

    return getCurrentStatement(view).currentStatements.map(item =>
      item.text.trim()
    );
  };

  it('splits a selection into its statements, in order', () => {
    const sqlText = `SELECT 1;
UPDATE users SET name = 'a' WHERE id = 1;
DELETE FROM logs;`;

    expect(selectStatements(sqlText, 0, sqlText.length)).toEqual([
      'SELECT 1;',
      "UPDATE users SET name = 'a' WHERE id = 1;",
      'DELETE FROM logs;',
    ]);
  });

  it('keeps semicolons inside strings, comments and dollar quotes', () => {
    const sqlText = `SELECT 'a;b' AS v;
-- note; not a split
SELECT 2;
DO $$ BEGIN PERFORM 1; END $$;`;

    const statements = selectStatements(sqlText, 0, sqlText.length);

    expect(statements).toHaveLength(3);
    expect(statements[0]).toBe("SELECT 'a;b' AS v;");
    expect(statements[1]).toContain('SELECT 2;');
    expect(statements[2]).toBe('DO $$ BEGIN PERFORM 1; END $$;');
  });

  it('includes whole statements that the selection only partly covers', () => {
    const sqlText = 'SELECT 1;\nSELECT 2;\nSELECT 3;';
    const from = sqlText.indexOf('1');
    const to = sqlText.indexOf('2') + 1;

    expect(selectStatements(sqlText, from, to)).toEqual([
      'SELECT 1;',
      'SELECT 2;',
    ]);
  });
});
