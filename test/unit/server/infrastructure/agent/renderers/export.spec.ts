import { describe, expect, it } from 'vitest';
import { buildExportFileResult } from '~/server/infrastructure/agent/renderers/export';

describe('buildExportFileResult', () => {
  const rows = [
    { id: 1, name: 'Ada', active: true },
    { id: 2, name: 'Grace', active: false },
  ];

  it('builds a CSV export with preview metadata', () => {
    const result = buildExportFileResult({
      data: rows,
      format: 'csv',
      tableName: 'users',
    });

    expect(result.filename).toBe('users.csv');
    expect(result.mimeType).toBe('text/csv;charset=utf-8');
    expect(result.encoding).toBe('utf8');
    expect(result.content).toContain('id,name,active');
    expect(result.preview.columns).toEqual(['id', 'name', 'active']);
    expect(result.preview.rows).toEqual(rows);
    expect(result.error).toBeUndefined();
  });

  it('builds SQL export content with create and insert statements', () => {
    const result = buildExportFileResult({
      data: rows,
      format: 'sql',
      tableName: 'users',
    });

    expect(result.filename).toBe('users.sql');
    expect(result.content).toContain('CREATE TABLE "users"');
    expect(result.content).toContain('INSERT INTO "users"');
    expect(result.content).toContain('"name" text');
    expect(result.content).toContain("'Ada'");
  });

  it('builds XLSX export content as base64', () => {
    const result = buildExportFileResult({
      data: rows,
      format: 'xlsx',
      filename: 'user export',
    });

    expect(result.filename).toBe('user-export.xlsx');
    expect(result.encoding).toBe('base64');
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.fileSize).toBeGreaterThan(0);
    expect(result.preview.rows).toEqual(rows);
  });

  it('returns an error result for empty exports', () => {
    const result = buildExportFileResult({
      data: [],
      format: 'json',
      filename: 'empty',
    });

    expect(result.filename).toBe('empty.json');
    expect(result.error).toBe('No rows available to export.');
    expect(result.preview.rows).toEqual([]);
    expect(result.fileSize).toBe(0);
  });
});
