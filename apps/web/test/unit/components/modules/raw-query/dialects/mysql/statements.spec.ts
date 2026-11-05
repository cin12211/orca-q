/**
 * @vitest-environment happy-dom
 */
import { EditorView } from '@codemirror/view';
import { describe, it, expect } from 'vitest';
import { SQLDialectSupport } from '~/components/base/code-editor/constants';
import {
  sqlParserConfigField,
  updateSqlParserConfigEffect,
} from '~/components/base/code-editor/states/sqlParserConfig';
import { getCurrentStatement } from '~/components/base/code-editor/utils/getCurrentStatement';
import { createTestState } from '../../helpers/test-editor-setup';

describe('MySQL Statement Parsing', () => {
  const parserDialect = SQLDialectSupport.MySQL;

  const createViewWithDialect = (sqlText: string) => {
    const { state, pos } = createTestState(sqlText, parserDialect, [
      sqlParserConfigField,
    ]);
    const view = new EditorView({ state });
    view.dispatch({
      effects: updateSqlParserConfigEffect.of({
        dialect: parserDialect,
        isEnable: true,
        statementMode: 'sql',
      }),
    });
    return { view, pos };
  };

  describe('Multiple Statements and Delimiters', () => {
    it('should correctly separate multiple standard statements', () => {
      const sqlText = `SELECT 1;! SELECT 2;`;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements).toHaveLength(1);
      expect(result.currentStatements[0].text).toBe('SELECT 1;');
    });

    it('should ignore semicolons inside string literals', () => {
      const sqlText = `SELECT 'A semicolon ; inside string' as text_val;! SELECT 2;`;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements[0].text).toBe(
        "SELECT 'A semicolon ; inside string' as text_val;"
      );
    });

    it('should ignore semicolons inside MySQL comments (# or --)', () => {
      const sqlText = `
SELECT 1;
# this is a comment with a semicolon; do not split here
SELECT 2;!
      `;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements[0].text.trim()).toContain('SELECT 2;');
      expect(result.currentStatements[0].text.trim()).not.toContain(
        'SELECT 1;'
      );
    });
  });

  describe('Backtick Identifiers', () => {
    it('should ignore semicolons inside backticked identifiers', () => {
      const sqlText = 'SELECT * FROM `my;weird;table`;! SELECT 2;';
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements[0].text).toBe(
        'SELECT * FROM `my;weird;table`;'
      );
    });
  });

  describe('Complex Queries', () => {
    it('should parse multi-line CTEs as a single statement', () => {
      const sqlText = `
WITH sales_cte AS (
  SELECT id, amount
  FROM sales
  WHERE date >= '2023-01-01'
),
summary AS (
  SELECT SUM(amount) as total FROM sales_cte
)
SELECT * FROM summary;!
SELECT * FROM other_table;
      `;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements).toHaveLength(1);
      expect(result.currentStatements[0].text).toContain('WITH sales_cte');
      expect(result.currentStatements[0].text).toContain(
        'SELECT * FROM summary;'
      );
    });

    it('should treat transactions as multiple statements but isolate them if cursor is on one', () => {
      const sqlText = `
START TRANSACTION;
INSERT INTO logs (msg) VALUES ('test');!
COMMIT;
      `;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements).toHaveLength(1);
      expect(result.currentStatements[0].text).toContain('INSERT INTO logs');
    });
  });
});
