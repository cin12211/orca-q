import { createError } from 'h3';
import { Readable } from 'node:stream';
import { to } from 'pg-copy-streams';
import QueryStream from 'pg-query-stream';
import type { IDatabaseAdapter } from '~/server/infrastructure/driver';

const BATCH_SIZE = 10_000;
const SQL_BATCH_SIZE = 1_0000;

export class PostgresTableExportAdapter {
  constructor(private readonly adapter: IDatabaseAdapter) {}

  async exportTableData(
    schema: string,
    tableName: string,
    format: string
  ): Promise<any> {
    const columnsResult = await this.adapter.rawQuery(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position`,
      [schema, tableName]
    );

    const columns: string[] = columnsResult.map(
      (r: { column_name: string }) => r.column_name
    );
    if (!columns.length) {
      throw createError({
        statusCode: 404,
        message: `Table ${schema}.${tableName} not found`,
      });
    }

    if (format === 'csv') {
      const client = await this.adapter.acquireRawConnection();
      try {
        const sql = `COPY "${schema}"."${tableName}" TO STDOUT WITH (FORMAT CSV, HEADER)`;
        const stream = client.query(to(sql));
        stream.on('finish', () => {
          this.adapter.releaseRawConnection(client);
        });
        stream.on('error', () => {
          this.adapter.releaseRawConnection(client);
        });
        return stream;
      } catch (err) {
        client.release();
        throw err;
      }
    }

    const handler = {
      json: {
        header: () => '[\n',
        row: (row: any, isFirst: boolean) =>
          (isFirst ? '' : ',\n') + JSON.stringify(row),
        footer: (totalRows: number) => '\n]',
      },
      sql: { row: () => '' },
    }[format as 'json' | 'sql'];

    const stream = new Readable({ read() {} });

    if (format === 'sql') {
      (async () => {
        const client = await this.adapter.acquireRawConnection();
        try {
          const queryStream = new QueryStream(
            `SELECT * FROM "${schema}"."${tableName}"`,
            [],
            { batchSize: BATCH_SIZE }
          );
          const dbStream = client.query(queryStream);

          stream.push(
            `-- Export of ${schema}.${tableName}\n-- Generated at ${new Date().toISOString()}\n\n`
          );
          let batch: Record<string, unknown>[] = [];
          let totalRows = 0;

          for await (const row of dbStream) {
            batch.push(row);
            totalRows++;
            if (batch.length >= SQL_BATCH_SIZE) {
              stream.push(
                this.generateSQLBatch(schema, tableName, columns, batch)
              );
              batch = [];
            }
          }

          if (batch.length > 0) {
            stream.push(
              this.generateSQLBatch(schema, tableName, columns, batch)
            );
          }

          stream.push(`\n-- Total rows exported: ${totalRows}\n`);
          stream.push(null);
        } catch (err) {
          stream.destroy(err as Error);
        } finally {
          await this.adapter.releaseRawConnection(client);
        }
      })();
      return stream;
    }

    if (format === 'json') {
      (async () => {
        const client = await this.adapter.acquireRawConnection();
        try {
          const queryStream = new QueryStream(
            `SELECT * FROM "${schema}"."${tableName}"`,
            [],
            { batchSize: BATCH_SIZE }
          );
          const dbStream = client.query(queryStream);

          let isFirstRow = true;
          let totalRows = 0;

          if (handler!.header) stream.push(handler!.header());

          for await (const row of dbStream) {
            totalRows++;
            stream.push(handler!.row(row, isFirstRow));
            isFirstRow = false;
          }

          if (handler!.footer) stream.push(handler!.footer(totalRows));
          stream.push(null);
        } catch (err) {
          stream.destroy(err as Error);
        } finally {
          await this.adapter.releaseRawConnection(client);
        }
      })();
      return stream;
    }

    throw createError({ statusCode: 400, message: 'Invalid format' });
  }

  private generateSQLBatch(
    schemaName: string,
    tableName: string,
    columns: string[],
    rows: Record<string, unknown>[]
  ): string {
    const cols = columns.map(c => `"${c}"`).join(', ');
    const values = rows
      .map(row => `(${this.formatSQLValues(columns, row)})`)
      .join(',\n');
    return `INSERT INTO "${schemaName}"."${tableName}" (${cols}) VALUES\n${values};\n\n`;
  }

  private formatSQLValues(
    columns: string[],
    row: Record<string, unknown>
  ): string {
    return columns
      .map(col => {
        const value = row[col];
        if (value === null || value === undefined) return 'NULL';
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        if (value instanceof Date) return `'${value.toISOString()}'`;
        if (typeof value === 'object') {
          return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        }
        return `'${String(value).replace(/'/g, "''")}'`;
      })
      .join(', ');
  }
}
