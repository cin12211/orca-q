import { describe, it, expect } from 'vitest';
import { extractParamsFromSql } from '~/components/modules/raw-query/utils/extractVariables';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('extractParamsFromSql', () => {
  describe('Standard Colon Extractor (Postgres, MySQL, Oracle, etc.)', () => {
    it('1. extracts basic parameters', () => {
      const sql = 'SELECT * FROM users WHERE id = :id AND status = :status';
      expect(extractParamsFromSql(sql)).toEqual(['id', 'status']);
    });

    it('2. ignores parameters inside single quoted string literals', () => {
      const sql =
        "SELECT * FROM users WHERE id = :id AND email = 'test:ignored' AND role = :role";
      expect(extractParamsFromSql(sql)).toEqual(['id', 'role']);
    });

    it('3. ignores parameters inside double quoted identifiers', () => {
      const sql = 'SELECT * FROM "table:ignored" WHERE id = :id';
      expect(extractParamsFromSql(sql)).toEqual(['id']);
    });

    it('4. ignores parameters inside single line comments', () => {
      const sql = `
        SELECT * FROM users WHERE id = :id
        -- This is a comment with :ignored_param
        AND status = :status
      `;
      expect(extractParamsFromSql(sql)).toEqual(['id', 'status']);
    });

    it('5. ignores parameters inside multiline comments', () => {
      const sql = `
        SELECT * FROM users WHERE id = :id
        /* This is a comment 
           with :ignored_param
        */
        AND status = :status
      `;
      expect(extractParamsFromSql(sql)).toEqual(['id', 'status']);
    });

    it('6. ignores double colons (typecast)', () => {
      const sql = 'SELECT id::text, name FROM users WHERE id = :id';
      expect(extractParamsFromSql(sql)).toEqual(['id']);
    });

    it('7. returns unique parameters only (deduplication)', () => {
      const sql =
        'SELECT * FROM users WHERE id = :id OR parent_id = :id AND status = :status';
      expect(extractParamsFromSql(sql)).toEqual(['id', 'status']);
    });

    it('8. handles subqueries containing parameters', () => {
      const sql =
        'SELECT * FROM (SELECT * FROM orders WHERE user_id = :userId) WHERE status = :status';
      expect(extractParamsFromSql(sql)).toEqual(['userId', 'status']);
    });

    it('9. extracts parameter at the very end of string', () => {
      const sql = 'SELECT * FROM users WHERE id = :id';
      expect(extractParamsFromSql(sql)).toEqual(['id']);
    });

    it('10. extracts parameter at the very beginning of string', () => {
      const sql = ':param_at_start SELECT 1';
      expect(extractParamsFromSql(sql)).toEqual(['param_at_start']);
    });

    it('11. extracts parameters with complex naming (underscores and digits)', () => {
      const sql = 'SELECT * FROM tbl WHERE x = :my_cool_variable_123';
      expect(extractParamsFromSql(sql)).toEqual(['my_cool_variable_123']);
    });

    it('12. ignores parameters that start with numbers', () => {
      const sql = 'SELECT * FROM tbl WHERE x = :1234_invalid';
      expect(extractParamsFromSql(sql)).toEqual([]);
    });

    it('13. extracts parameters without whitespace formatting (e.g. id=:id)', () => {
      const sql = 'SELECT * FROM tbl WHERE id=:id_val';
      expect(extractParamsFromSql(sql)).toEqual(['id_val']);
    });

    it('14. handles complex CTE query parameters', () => {
      const sql = `
        WITH user_cte AS (
          SELECT * FROM users WHERE status = :active_status
        )
        SELECT * FROM user_cte WHERE role = :role_type
      `;
      expect(extractParamsFromSql(sql)).toEqual(['active_status', 'role_type']);
    });

    it('15. returns empty array when there are no parameters', () => {
      const sql = 'SELECT * FROM users WHERE id = 1';
      expect(extractParamsFromSql(sql)).toEqual([]);
    });
  });

  describe('MSSQL Extractor (@)', () => {
    it('16. extracts basic parameters with @', () => {
      const sql = 'SELECT * FROM users WHERE id = @id AND status = @status';
      expect(extractParamsFromSql(sql, DatabaseClientType.MSSQL)).toEqual([
        'id',
        'status',
      ]);
    });

    it('17. ignores @ parameters inside strings and comments', () => {
      const sql = `
        SELECT * FROM users WHERE id = @id
        -- comment with @ignored_param
        AND email = 'test@example.com'
        AND status = @status
      `;
      expect(extractParamsFromSql(sql, DatabaseClientType.MSSQL)).toEqual([
        'id',
        'status',
      ]);
    });

    it('18. returns unique MSSQL parameters only', () => {
      const sql = 'SELECT * FROM users WHERE id = @id OR parent_id = @id';
      expect(extractParamsFromSql(sql, DatabaseClientType.MSSQL)).toEqual([
        'id',
      ]);
    });

    it('19. extracts MSSQL parameters without whitespace formatting (e.g. id=@id)', () => {
      const sql = 'SELECT * FROM users WHERE id=@id';
      expect(extractParamsFromSql(sql, DatabaseClientType.MSSQL)).toEqual([
        'id',
      ]);
    });

    it('20. extracts MSSQL parameters with complex names and underscores', () => {
      const sql = 'SELECT * FROM logs WHERE level = @log_level_99';
      expect(extractParamsFromSql(sql, DatabaseClientType.MSSQL)).toEqual([
        'log_level_99',
      ]);
    });
  });
});
