import { describe, expect, it } from 'vitest';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { parseConnectionString } from '~/core/helpers/parser-connection-string';
import { EConnectionFamily } from '~/core/types/entities/connection.entity';

describe('parseConnectionString — Redshift', () => {
  it('parses a redshift:// URI', () => {
    const result = parseConnectionString(
      'redshift://admin:secret@my-cluster.abc123.us-east-1.redshift.amazonaws.com:5439/analytics'
    );

    expect(result.type).toBe(DatabaseClientType.REDSHIFT);
    expect(result.family).toBe(EConnectionFamily.SQL);
    expect(result.host).toBe(
      'my-cluster.abc123.us-east-1.redshift.amazonaws.com'
    );
    expect(result.port).toBe(5439);
    expect(result.username).toBe('admin');
    expect(result.password).toBe('secret');
    expect(result.database).toBe('analytics');
    expect(result.masked).not.toContain('secret');
  });

  it('defaults to port 5439 when no port is given', () => {
    const result = parseConnectionString('redshift://admin:secret@host/db');
    expect(result.port).toBe(5439);
  });
});

describe('parseConnectionString — CockroachDB', () => {
  it('parses a cockroachdb:// URI', () => {
    const result = parseConnectionString(
      'cockroachdb://root:secret@localhost:26257/defaultdb'
    );

    expect(result.type).toBe(DatabaseClientType.COCKROACHDB);
    expect(result.family).toBe(EConnectionFamily.SQL);
    expect(result.host).toBe('localhost');
    expect(result.port).toBe(26257);
    expect(result.username).toBe('root');
    expect(result.database).toBe('defaultdb');
  });

  it('defaults to port 26257 when no port is given', () => {
    const result = parseConnectionString('cockroachdb://root:secret@host/db');
    expect(result.port).toBe(26257);
  });
});
