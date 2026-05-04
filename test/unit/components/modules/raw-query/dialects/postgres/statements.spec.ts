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

describe('PostgreSQL Statement Parsing', () => {
  const parserDialect = SQLDialectSupport.PostgreSQLParserDialect;

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

  describe('Dollar-Quoted Strings and Blocks', () => {
    it('should treat a dollar-quoted function as a single statement', () => {
      const sqlText = `
CREATE OR REPLACE FUNCTION test_func() RETURNS text AS $$
BEGIN
  RETURN 'hello';
END;
$$ LANGUAGE plpgsql;!
SELECT 1;
      `;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements).toHaveLength(1);
      expect(result.currentStatements[0].text).toContain(
        'CREATE OR REPLACE FUNCTION'
      );
      expect(result.currentStatements[0].text).toContain('$$ LANGUAGE plpgsql');
      expect(result.currentStatements[0].text).not.toContain('SELECT 1');
    });

    it('should correctly parse DO blocks with standard dollar quotes', () => {
      const sqlText = `
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM users;
  RAISE NOTICE 'Count: %', v_count;
END $$;!
SELECT * FROM users;
      `;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements).toHaveLength(1);
      expect(result.currentStatements[0].text).toContain('DO $$');
      expect(result.currentStatements[0].text).toContain('END $$;');
      expect(result.currentStatements[0].text).not.toContain(
        'SELECT * FROM users'
      );
    });

    it('should correctly parse DO blocks with tagged dollar quotes ($BODY$)', () => {
      const sqlText = `
SELECT 1;
DO $BODY$
BEGIN
  PERFORM test_action();
END $BODY$;!
      `;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements).toHaveLength(1);
      expect(result.currentStatements[0].text).toContain('DO $BODY$');
      expect(result.currentStatements[0].text).toContain('END $BODY$;');
      expect(result.currentStatements[0].text).not.toContain('SELECT 1');
    });
  });

  describe('Multiple Statements and Delimiters', () => {
    it('should correctly separate multiple standard statements', () => {
      const sqlText = `SELECT 1;! SELECT 2;`;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements).toHaveLength(1);
      expect(result.currentStatements[0].text).toBe('SELECT 1;');
    });

    it('should handle cursor between statements correctly', () => {
      const sqlText = `SELECT 1; S!ELECT 2;`;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements[0].text).toBe('SELECT 2;');
    });

    it('should ignore semicolons inside string literals', () => {
      const sqlText = `SELECT 'A semicolon ; inside string' as text_val;! SELECT 2;`;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements[0].text).toBe(
        "SELECT 'A semicolon ; inside string' as text_val;"
      );
    });

    it('should ignore semicolons inside comments', () => {
      const sqlText = `
SELECT 1;
-- this is a comment with a semicolon; do not split here
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
      expect(result.currentStatements[0].text).not.toContain('other_table');
    });

    it('should treat transactions as multiple statements but isolate them if cursor is on one', () => {
      const sqlText = `
BEGIN;
INSERT INTO logs (msg) VALUES ('test');!
COMMIT;
      `;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements).toHaveLength(1);
      expect(result.currentStatements[0].text).toContain('INSERT INTO logs');
    });

    it('should correctly handle JSONB operators with semicolons or string characters', () => {
      // JSON operators like ?| and strings with semicolons should be handled correctly
      const sqlText = `
SELECT metadata -> 'key;value' as v FROM documents WHERE metadata ?| array['a', 'b'];!
SELECT 2;
      `;
      const { view } = createViewWithDialect(sqlText);

      const result = getCurrentStatement(view);
      expect(result.currentStatements[0].text).toContain(
        "metadata -> 'key;value'"
      );
      expect(result.currentStatements[0].text).not.toContain('SELECT 2');
    });
  });
});
