import { describe, expect, it } from 'vitest';
import {
  getDialectStyle,
  substituteParams,
} from '~/components/base/code-editor/utils/sqlErrorDiagnostics';
import { DatabaseClientType } from '~/core/constants/database-client-type';

describe('sqlErrorDiagnostics', () => {
  describe('getDialectStyle', () => {
    it('returns Oracle positional binds for Oracle clients', () => {
      expect(getDialectStyle(DatabaseClientType.ORACLE)).toBe(
        'oracle-positional'
      );
    });

    it('keeps question-mark binds for MariaDB clients', () => {
      expect(getDialectStyle(DatabaseClientType.MARIADB)).toBe('question-mark');
    });
  });

  describe('substituteParams', () => {
    it('maps Oracle named parameters to numbered binds', () => {
      expect(
        substituteParams(
          'SELECT * FROM dual WHERE id = :id AND status = :status',
          { id: 1, status: 'ACTIVE' },
          DatabaseClientType.ORACLE
        )
      ).toBe('SELECT * FROM dual WHERE id = :1 AND status = :2');
    });

    it('skips quoted literals while substituting Oracle binds', () => {
      expect(
        substituteParams(
          "SELECT ':id' AS literal_value, user_id FROM users WHERE user_id = :id",
          { id: 42 },
          DatabaseClientType.ORACLE
        )
      ).toBe(
        "SELECT ':id' AS literal_value, user_id FROM users WHERE user_id = :1"
      );
    });
  });
});
