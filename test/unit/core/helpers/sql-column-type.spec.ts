import { describe, expect, it } from 'vitest';
import { isBinaryColumnType } from '~/core/helpers/sql-column-type';

describe('isBinaryColumnType', () => {
  it.each([
    'bytea',
    'BLOB',
    'tinyblob',
    'mediumblob',
    'longblob',
    'binary(16)',
    'VARBINARY(255)',
    'varbinary(max)',
    'raw',
    'RAW(2000)',
    'long raw',
    'image',
    ' blob ',
  ])('%s is binary', type => {
    expect(isBinaryColumnType(type)).toBe(true);
  });

  it.each(['text', 'varchar(255)', 'json', 'bytea[]', '_bytea', 'bit', ''])(
    '%s is not binary',
    type => {
      expect(isBinaryColumnType(type)).toBe(false);
    }
  );
});
