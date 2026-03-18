/**
 * Tests for substituteParams() and getDialectStyle()
 *
 * These are the browser-safe replacements for knex .raw().toSQL().toNative().
 * The suite covers all branching paths and edge cases so the functions can be
 * safely extended without breaking existing behaviour.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  substituteParams,
  getDialectStyle,
  type SqlDialectStyle,
  type SubstituteParamsOptions,
} from '@/components/base/code-editor/utils/sqlErrorDiagnostics';
import { DatabaseClientType } from '@/core/constants/database-client-type';

// The module imports ~ CodeMirror types and helpers that are irrelevant for
// these unit tests. Mock them so the module evaluates cleanly in Node.
vi.mock('@/core/helpers', () => ({
  DatabaseDriverNormalizerError: class {},
}));
vi.mock('@/components/base/code-editor/utils/diagnostic-lint', () => ({
  pushDiagnostics: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// getDialectStyle
// ─────────────────────────────────────────────────────────────────────────────
describe('getDialectStyle', () => {
  it('01 — POSTGRES returns positional', () => {
    expect(getDialectStyle(DatabaseClientType.POSTGRES)).toBe('positional');
  });

  it('02 — MYSQL returns question-mark', () => {
    expect(getDialectStyle(DatabaseClientType.MYSQL)).toBe('question-mark');
  });

  it('03 — MYSQL2 returns question-mark', () => {
    expect(getDialectStyle(DatabaseClientType.MYSQL2)).toBe('question-mark');
  });

  it('04 — SQLITE3 returns question-mark', () => {
    expect(getDialectStyle(DatabaseClientType.SQLITE3)).toBe('question-mark');
  });

  it('05 — BETTER_SQLITE3 returns question-mark', () => {
    expect(getDialectStyle(DatabaseClientType.BETTER_SQLITE3)).toBe(
      'question-mark'
    );
  });

  it('06 — MSSQL returns question-mark', () => {
    expect(getDialectStyle(DatabaseClientType.MSSQL)).toBe('question-mark');
  });

  it('07 — ORACLE returns question-mark', () => {
    expect(getDialectStyle(DatabaseClientType.ORACLE)).toBe('question-mark');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// substituteParams — fast paths (no work needed)
// ─────────────────────────────────────────────────────────────────────────────
describe('substituteParams — no-op fast paths', () => {
  it('08 — empty params returns SQL unchanged', () => {
    const sql = 'SELECT * FROM users WHERE id = :id';
    expect(substituteParams(sql, {}, DatabaseClientType.POSTGRES)).toBe(sql);
  });

  it('09 — SQL with no named params returns unchanged', () => {
    const sql = 'SELECT * FROM users WHERE id = 1';
    expect(substituteParams(sql, { id: 1 }, DatabaseClientType.POSTGRES)).toBe(
      sql
    );
  });

  it('10 — empty SQL string returns empty string', () => {
    expect(substituteParams('', { id: 1 }, DatabaseClientType.POSTGRES)).toBe(
      ''
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// substituteParams — PostgreSQL positional ($N)
// ─────────────────────────────────────────────────────────────────────────────
describe('substituteParams — PostgreSQL positional placeholders', () => {
  const pg = DatabaseClientType.POSTGRES;

  it('11 — single named param becomes $1', () => {
    expect(
      substituteParams('SELECT * FROM users WHERE id = :id', { id: 1 }, pg)
    ).toBe('SELECT * FROM users WHERE id = $1');
  });

  it('12 — two different params become $1 and $2 in order', () => {
    expect(
      substituteParams(
        'SELECT * FROM t WHERE a = :alpha AND b = :beta',
        { alpha: 1, beta: 2 },
        pg
      )
    ).toBe('SELECT * FROM t WHERE a = $1 AND b = $2');
  });

  it('13 — three params → $1, $2, $3', () => {
    const sql = 'INSERT INTO t (a, b, c) VALUES (:a, :b, :c)';
    expect(substituteParams(sql, { a: 1, b: 2, c: 3 }, pg)).toBe(
      'INSERT INTO t (a, b, c) VALUES ($1, $2, $3)'
    );
  });

  it('14 — same param used twice gets two separate placeholders ($1 and $2)', () => {
    // Matches knex behaviour: each usage is a separate binding slot
    const sql = 'SELECT :x + :x AS result';
    expect(substituteParams(sql, { x: 5 }, pg)).toBe(
      'SELECT $1 + $2 AS result'
    );
  });

  it('15 — param at the very start of the SQL', () => {
    expect(substituteParams(':val AS col', { val: 1 }, pg)).toBe('$1 AS col');
  });

  it('16 — param at the very end of the SQL', () => {
    expect(
      substituteParams('SELECT * FROM t WHERE id = :id', { id: 99 }, pg)
    ).toBe('SELECT * FROM t WHERE id = $1');
  });

  it('17 — adjacent params without whitespace between them', () => {
    expect(substituteParams(':a,:b', { a: 1, b: 2 }, pg)).toBe('$1,$2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// substituteParams — question-mark clients
// ─────────────────────────────────────────────────────────────────────────────
describe('substituteParams — question-mark placeholders', () => {
  it('18 — MYSQL replaces with ?', () => {
    expect(
      substituteParams(
        'SELECT * FROM t WHERE id = :id',
        { id: 1 },
        DatabaseClientType.MYSQL
      )
    ).toBe('SELECT * FROM t WHERE id = ?');
  });

  it('19 — MYSQL2 replaces with ?', () => {
    expect(
      substituteParams(
        'DELETE FROM t WHERE id = :id',
        { id: 5 },
        DatabaseClientType.MYSQL2
      )
    ).toBe('DELETE FROM t WHERE id = ?');
  });

  it('20 — SQLITE3 replaces with ?', () => {
    expect(
      substituteParams(
        'UPDATE t SET x = :x WHERE id = :id',
        { x: 10, id: 1 },
        DatabaseClientType.SQLITE3
      )
    ).toBe('UPDATE t SET x = ? WHERE id = ?');
  });

  it('21 — MSSQL replaces with ?', () => {
    expect(
      substituteParams('SELECT :val', { val: 'a' }, DatabaseClientType.MSSQL)
    ).toBe('SELECT ?');
  });

  it('22 — ORACLE replaces with ?', () => {
    expect(
      substituteParams(
        'SELECT :val FROM dual',
        { val: 42 },
        DatabaseClientType.ORACLE
      )
    ).toBe('SELECT ? FROM dual');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// substituteParams — unknown params preserved verbatim
// ─────────────────────────────────────────────────────────────────────────────
describe('substituteParams — unknown param names', () => {
  const pg = DatabaseClientType.POSTGRES;

  it('23 — unknown param left verbatim', () => {
    const sql = 'SELECT :unknown FROM t';
    expect(substituteParams(sql, { other: 1 }, pg)).toBe(sql);
  });

  it('24 — mix of known and unknown: known replaced, unknown preserved', () => {
    expect(
      substituteParams('WHERE a = :known AND b = :unknown', { known: 1 }, pg)
    ).toBe('WHERE a = $1 AND b = :unknown');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// substituteParams — string-literal protection
// ─────────────────────────────────────────────────────────────────────────────
describe('substituteParams — skip content inside string literals', () => {
  const pg = DatabaseClientType.POSTGRES;

  it('25 — param inside single-quoted string is NOT substituted', () => {
    const sql = "SELECT ':id' AS literal, :id AS value";
    expect(substituteParams(sql, { id: 1 }, pg)).toBe(
      "SELECT ':id' AS literal, $1 AS value"
    );
  });

  it("26 — escaped single quote ('') inside literal does not terminate string early", () => {
    // SQL: WHERE note = 'it''s :fine' AND id = :id
    const sql = "WHERE note = 'it''s :fine' AND id = :id";
    expect(substituteParams(sql, { id: 42, fine: 'x' }, pg)).toBe(
      "WHERE note = 'it''s :fine' AND id = $1"
    );
  });

  it('27 — param inside double-quoted identifier is NOT substituted', () => {
    const sql = 'SELECT "col:name" AS c, :val AS v';
    expect(substituteParams(sql, { val: 7, name: 'x' }, pg)).toBe(
      'SELECT "col:name" AS c, $1 AS v'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// substituteParams — edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe('substituteParams — edge cases', () => {
  const pg = DatabaseClientType.POSTGRES;

  it('28 — colon NOT followed by [a-zA-Z_] is left verbatim (e.g. ::text cast)', () => {
    const sql = "SELECT '2026-01-01'::date, :val::text";
    expect(substituteParams(sql, { val: 'ok' }, pg)).toBe(
      "SELECT '2026-01-01'::date, $1::text"
    );
  });

  it('29 — param name with underscores and digits (:my_param_1)', () => {
    expect(
      substituteParams('WHERE id = :my_param_1', { my_param_1: 99 }, pg)
    ).toBe('WHERE id = $1');
  });

  it('30 — colon at the very end of SQL (no following char) is left verbatim', () => {
    const sql = 'SELECT :val AND ';
    expect(substituteParams(sql, { val: 1 }, pg)).toBe('SELECT $1 AND ');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// substituteParams — SubstituteParamsOptions extensibility
// ─────────────────────────────────────────────────────────────────────────────
describe('substituteParams — options override (extensibility)', () => {
  it('31 — style: positional forces $N even for MySQL client', () => {
    const opts: SubstituteParamsOptions = { style: 'positional' };
    expect(
      substituteParams(
        'WHERE a = :a AND b = :b',
        { a: 1, b: 2 },
        DatabaseClientType.MYSQL,
        opts
      )
    ).toBe('WHERE a = $1 AND b = $2');
  });

  it('32 — style: question-mark forces ? even for POSTGRES client', () => {
    const opts: SubstituteParamsOptions = { style: 'question-mark' };
    expect(
      substituteParams(
        'WHERE id = :id',
        { id: 1 },
        DatabaseClientType.POSTGRES,
        opts
      )
    ).toBe('WHERE id = ?');
  });

  it('33 — startIndex: 5 starts positional placeholders at $5', () => {
    const opts: SubstituteParamsOptions = { startIndex: 5 };
    expect(
      substituteParams(
        'WHERE a = :a AND b = :b',
        { a: 1, b: 2 },
        DatabaseClientType.POSTGRES,
        opts
      )
    ).toBe('WHERE a = $5 AND b = $6');
  });

  it('34 — startIndex and style can be combined independently', () => {
    const opts: SubstituteParamsOptions = {
      style: 'positional',
      startIndex: 3,
    };
    expect(
      substituteParams(
        ':x, :y, :z',
        { x: 1, y: 2, z: 3 },
        DatabaseClientType.MYSQL,
        opts
      )
    ).toBe('$3, $4, $5');
  });

  it('35 — no options object passed: defaults are applied correctly', () => {
    expect(
      substituteParams('WHERE id = :id', { id: 1 }, DatabaseClientType.POSTGRES)
    ).toBe('WHERE id = $1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Per-client extended scenarios — 5 tests each
// ─────────────────────────────────────────────────────────────────────────────

describe('substituteParams — POSTGRES extended (5 scenarios)', () => {
  const pg = DatabaseClientType.POSTGRES;

  it('36 — UPDATE with multiple SET columns uses sequential $N', () => {
    expect(
      substituteParams(
        'UPDATE users SET name = :name, email = :email, age = :age WHERE id = :id',
        { name: 'n', email: 'e', age: 30, id: 1 },
        pg
      )
    ).toBe('UPDATE users SET name = $1, email = $2, age = $3 WHERE id = $4');
  });

  it('37 — multi-line SQL preserves newlines', () => {
    const sql =
      'SELECT *\nFROM orders\nWHERE status = :status\n  AND created_at > :since';
    expect(
      substituteParams(sql, { status: 'open', since: '2026-01-01' }, pg)
    ).toBe('SELECT *\nFROM orders\nWHERE status = $1\n  AND created_at > $2');
  });

  it('38 — JOIN ON condition with params on both sides', () => {
    expect(
      substituteParams(
        'SELECT * FROM a JOIN b ON a.tid = :tid AND b.type = :type',
        { tid: 1, type: 'x' },
        pg
      )
    ).toBe('SELECT * FROM a JOIN b ON a.tid = $1 AND b.type = $2');
  });

  it('39 — LIMIT and OFFSET params', () => {
    expect(
      substituteParams(
        'SELECT * FROM users ORDER BY id LIMIT :limit OFFSET :offset',
        { limit: 10, offset: 20 },
        pg
      )
    ).toBe('SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2');
  });

  it('40 — INSERT returning all columns — 5 params → $1..$5', () => {
    expect(
      substituteParams(
        'INSERT INTO t (a,b,c,d,e) VALUES (:a,:b,:c,:d,:e) RETURNING *',
        { a: 1, b: 2, c: 3, d: 4, e: 5 },
        pg
      )
    ).toBe('INSERT INTO t (a,b,c,d,e) VALUES ($1,$2,$3,$4,$5) RETURNING *');
  });
});

describe('substituteParams — MYSQL extended (5 scenarios)', () => {
  const my = DatabaseClientType.MYSQL;

  it('41 — UPDATE with multiple SET columns → all ?', () => {
    expect(
      substituteParams(
        'UPDATE users SET name = :name, role = :role WHERE id = :id',
        { name: 'n', role: 'admin', id: 7 },
        my
      )
    ).toBe('UPDATE users SET name = ?, role = ? WHERE id = ?');
  });

  it('42 — LIMIT and OFFSET params → ?', () => {
    expect(
      substituteParams(
        'SELECT * FROM logs ORDER BY ts DESC LIMIT :limit OFFSET :offset',
        { limit: 25, offset: 50 },
        my
      )
    ).toBe('SELECT * FROM logs ORDER BY ts DESC LIMIT ? OFFSET ?');
  });

  it('43 — JOIN ON with two params → two ?', () => {
    expect(
      substituteParams(
        'SELECT * FROM a JOIN b ON a.wid = :wid AND b.cid = :cid',
        { wid: 1, cid: 2 },
        my
      )
    ).toBe('SELECT * FROM a JOIN b ON a.wid = ? AND b.cid = ?');
  });

  it('44 — INSERT with 4 columns → four ?', () => {
    expect(
      substituteParams(
        'INSERT INTO orders (uid,amount,status,note) VALUES (:uid,:amount,:status,:note)',
        { uid: 1, amount: 99.9, status: 'open', note: 'ok' },
        my
      )
    ).toBe('INSERT INTO orders (uid,amount,status,note) VALUES (?,?,?,?)');
  });

  it('45 — multi-line SQL with 3 params → three ?', () => {
    const sql =
      'SELECT id\nFROM products\nWHERE price > :min\n  AND price < :max\n  AND category = :cat';
    expect(substituteParams(sql, { min: 10, max: 200, cat: 'tools' }, my)).toBe(
      'SELECT id\nFROM products\nWHERE price > ?\n  AND price < ?\n  AND category = ?'
    );
  });
});

describe('substituteParams — MYSQL2 extended (5 scenarios)', () => {
  const m2 = DatabaseClientType.MYSQL2;

  it('46 — DELETE with composite WHERE', () => {
    expect(
      substituteParams(
        'DELETE FROM sessions WHERE uid = :uid AND token = :token',
        { uid: 5, token: 'abc' },
        m2
      )
    ).toBe('DELETE FROM sessions WHERE uid = ? AND token = ?');
  });

  it('47 — REPLACE INTO with 3 params', () => {
    expect(
      substituteParams(
        'REPLACE INTO cache (k,v,ttl) VALUES (:k,:v,:ttl)',
        { k: 'key', v: 'val', ttl: 300 },
        m2
      )
    ).toBe('REPLACE INTO cache (k,v,ttl) VALUES (?,?,?)');
  });

  it('48 — HAVING clause param', () => {
    expect(
      substituteParams(
        'SELECT dept, COUNT(*) AS cnt FROM emp GROUP BY dept HAVING cnt > :min',
        { min: 3 },
        m2
      )
    ).toBe(
      'SELECT dept, COUNT(*) AS cnt FROM emp GROUP BY dept HAVING cnt > ?'
    );
  });

  it('49 — CASE WHEN with two params', () => {
    expect(
      substituteParams(
        'SELECT CASE WHEN score >= :pass THEN :grade ELSE NULL END AS result FROM exams',
        { pass: 60, grade: 'pass' },
        m2
      )
    ).toBe(
      'SELECT CASE WHEN score >= ? THEN ? ELSE NULL END AS result FROM exams'
    );
  });

  it('50 — param immediately followed by a comma', () => {
    expect(
      substituteParams('INSERT INTO t (a,b) VALUES (:a,:b)', { a: 1, b: 2 }, m2)
    ).toBe('INSERT INTO t (a,b) VALUES (?,?)');
  });
});

describe('substituteParams — SQLITE3 extended (5 scenarios)', () => {
  const sq = DatabaseClientType.SQLITE3;

  it('51 — INSERT OR REPLACE with 3 params', () => {
    expect(
      substituteParams(
        'INSERT OR REPLACE INTO kv (key,value,ts) VALUES (:key,:value,:ts)',
        { key: 'k', value: 'v', ts: 1 },
        sq
      )
    ).toBe('INSERT OR REPLACE INTO kv (key,value,ts) VALUES (?,?,?)');
  });

  it('52 — WHERE NOT condition', () => {
    expect(
      substituteParams(
        'SELECT * FROM t WHERE NOT (status = :status)',
        { status: 'deleted' },
        sq
      )
    ).toBe('SELECT * FROM t WHERE NOT (status = ?)');
  });

  it('53 — subquery with param', () => {
    expect(
      substituteParams(
        'SELECT * FROM t WHERE id IN (SELECT id FROM r WHERE key = :key)',
        { key: 'x' },
        sq
      )
    ).toBe('SELECT * FROM t WHERE id IN (SELECT id FROM r WHERE key = ?)');
  });

  it('54 — UPDATE with 4 SET params', () => {
    expect(
      substituteParams(
        'UPDATE t SET a = :a, b = :b, c = :c, d = :d WHERE id = :id',
        { a: 1, b: 2, c: 3, d: 4, id: 9 },
        sq
      )
    ).toBe('UPDATE t SET a = ?, b = ?, c = ?, d = ? WHERE id = ?');
  });

  it('55 — LIMIT + OFFSET → two ?', () => {
    expect(
      substituteParams(
        'SELECT * FROM items WHERE active = :active LIMIT :lim OFFSET :off',
        { active: 1, lim: 10, off: 0 },
        sq
      )
    ).toBe('SELECT * FROM items WHERE active = ? LIMIT ? OFFSET ?');
  });
});

describe('substituteParams — BETTER_SQLITE3 extended (5 scenarios)', () => {
  const bs = DatabaseClientType.BETTER_SQLITE3;

  it('56 — SELECT with one column param', () => {
    expect(
      substituteParams(
        'SELECT * FROM t WHERE name = :name',
        { name: 'bob' },
        bs
      )
    ).toBe('SELECT * FROM t WHERE name = ?');
  });

  it('57 — DELETE with two conditions', () => {
    expect(
      substituteParams(
        'DELETE FROM cache WHERE ns = :ns AND key = :key',
        { ns: 'app', key: 'cfg' },
        bs
      )
    ).toBe('DELETE FROM cache WHERE ns = ? AND key = ?');
  });

  it('58 — INSERT with 5 value params', () => {
    expect(
      substituteParams(
        'INSERT INTO log (ts,lvl,msg,src,uid) VALUES (:ts,:lvl,:msg,:src,:uid)',
        { ts: 1, lvl: 'info', msg: 'm', src: 'bg', uid: 42 },
        bs
      )
    ).toBe('INSERT INTO log (ts,lvl,msg,src,uid) VALUES (?,?,?,?,?)');
  });

  it('59 — nested WHERE with OR', () => {
    expect(
      substituteParams(
        'SELECT * FROM t WHERE (a = :a OR b = :b) AND c = :c',
        { a: 1, b: 2, c: 3 },
        bs
      )
    ).toBe('SELECT * FROM t WHERE (a = ? OR b = ?) AND c = ?');
  });

  it('60 — UPDATE single column + WHERE', () => {
    expect(
      substituteParams(
        'UPDATE settings SET value = :value WHERE key = :key',
        { value: 'dark', key: 'theme' },
        bs
      )
    ).toBe('UPDATE settings SET value = ? WHERE key = ?');
  });
});

describe('substituteParams — MSSQL extended (5 scenarios)', () => {
  const ms = DatabaseClientType.MSSQL;

  it('61 — SELECT TOP :n with additional WHERE', () => {
    expect(
      substituteParams(
        'SELECT TOP :n id FROM users WHERE active = :active',
        { n: 10, active: 1 },
        ms
      )
    ).toBe('SELECT TOP ? id FROM users WHERE active = ?');
  });

  it('62 — ISNULL with two params', () => {
    expect(
      substituteParams(
        'SELECT ISNULL(:val, :def) AS result',
        { val: null, def: 0 },
        ms
      )
    ).toBe('SELECT ISNULL(?, ?) AS result');
  });

  it('63 — multi-condition WHERE with 3 params', () => {
    expect(
      substituteParams(
        'SELECT * FROM orders WHERE total > :min AND status = :status AND uid = :uid',
        { min: 100, status: 'paid', uid: 7 },
        ms
      )
    ).toBe('SELECT * FROM orders WHERE total > ? AND status = ? AND uid = ?');
  });

  it('64 — CHARINDEX call with two params', () => {
    expect(
      substituteParams(
        'SELECT CHARINDEX(:needle, :haystack) AS pos',
        { needle: 'fn', haystack: 'info' },
        ms
      )
    ).toBe('SELECT CHARINDEX(?, ?) AS pos');
  });

  it('65 — UPDATE with 3 SET cols + WHERE', () => {
    expect(
      substituteParams(
        'UPDATE t SET x = :x, y = :y, z = :z WHERE id = :id',
        { x: 1, y: 2, z: 3, id: 9 },
        ms
      )
    ).toBe('UPDATE t SET x = ?, y = ?, z = ? WHERE id = ?');
  });
});

describe('substituteParams — ORACLE extended (5 scenarios)', () => {
  const ora = DatabaseClientType.ORACLE;

  it('66 — SELECT from dual with single param', () => {
    expect(
      substituteParams('SELECT :val AS n FROM dual', { val: 42 }, ora)
    ).toBe('SELECT ? AS n FROM dual');
  });

  it('67 — ROWNUM guard + WHERE param', () => {
    expect(
      substituteParams(
        'SELECT * FROM t WHERE status = :status AND ROWNUM <= :rows',
        { status: 'active', rows: 50 },
        ora
      )
    ).toBe('SELECT * FROM t WHERE status = ? AND ROWNUM <= ?');
  });

  it('68 — NVL with two params', () => {
    expect(
      substituteParams(
        'SELECT NVL(:val, :default) AS result FROM dual',
        { val: null, default: 0 },
        ora
      )
    ).toBe('SELECT NVL(?, ?) AS result FROM dual');
  });

  it('69 — INSERT with 4 columns', () => {
    expect(
      substituteParams(
        'INSERT INTO employees (id,name,dept,sal) VALUES (:id,:name,:dept,:sal)',
        { id: 1, name: 'ann', dept: 'eng', sal: 5000 },
        ora
      )
    ).toBe('INSERT INTO employees (id,name,dept,sal) VALUES (?,?,?,?)');
  });

  it('70 — multi-param UPDATE', () => {
    expect(
      substituteParams(
        'UPDATE accts SET bal = :bal, updated = :upd WHERE acct_id = :aid',
        { bal: 1000, upd: 'now', aid: 99 },
        ora
      )
    ).toBe('UPDATE accts SET bal = ?, updated = ? WHERE acct_id = ?');
  });
});
