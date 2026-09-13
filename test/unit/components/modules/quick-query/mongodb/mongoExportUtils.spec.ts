import { describe, expect, it } from 'vitest';
import { resolveMongoExportFileName } from '~/components/modules/quick-query/mongodb/utils/mongoExportUtils';

describe('resolveMongoExportFileName', () => {
  it('resolves default template {collection}_{timestamp}_export to <collection>_<timestamp>_export.<format>', () => {
    const result = resolveMongoExportFileName(
      '{collection}_{timestamp}_export',
      {
        collection: 'users',
        database: 'shop',
        format: 'json',
      }
    );
    expect(result).toMatch(/^users_\d+_export\.json$/);
  });

  it('resolves empty template to fallback <collection>_<timestamp>_export.<format>', () => {
    const result = resolveMongoExportFileName('', {
      collection: 'orders',
      database: 'shop',
      format: 'csv',
    });
    expect(result).toMatch(/^orders_\d+_export\.csv$/);
  });

  it('supports {collection}, {database}, {date}, and {timestamp} variables', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    const result = resolveMongoExportFileName(
      '{database}_{collection}_{date}',
      {
        collection: 'orders',
        database: 'shop',
        format: 'json',
      }
    );
    expect(result).toBe(`shop_orders_${today}.json`);
  });

  it('handles custom filenames without variables and strips redundant extensions', () => {
    const resultJson = resolveMongoExportFileName('custom_backup.json', {
      collection: 'orders',
      format: 'json',
    });
    expect(resultJson).toBe('custom_backup.json');

    const resultCsv = resolveMongoExportFileName('custom_backup.json', {
      collection: 'orders',
      format: 'csv',
    });
    expect(resultCsv).toBe('custom_backup.csv');
  });

  it('sanitizes illegal filename characters', () => {
    const result = resolveMongoExportFileName('my/invalid:name*test', {
      collection: 'orders',
      format: 'json',
    });
    expect(result).toBe('my_invalid_name_test.json');
  });
});
