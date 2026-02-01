import dayjs from 'dayjs';
import {
  defineEventHandler,
  readBody,
  createError,
  setResponseHeaders,
} from 'h3';
import { Readable } from 'node:stream';
import { to } from 'pg-copy-streams';
import QueryStream from 'pg-query-stream';
import { getPgPool } from '../utils/db-row-connection';

export enum ExportDataFormat {
  CSV = 'csv',
  JSON = 'json',
  SQL = 'sql',
}

interface ExportTableDataRequest {
  dbConnectionString: string;
  schemaName: string;
  tableName: string;
  format: ExportDataFormat;
}

/**
 * Rows per cursor fetch
 */
const BATCH_SIZE = 10_000;

/**
 * Rows per SQL INSERT statement for bulk export
 * This batches multiple rows into single INSERT statements for efficiency
 */
const SQL_BATCH_SIZE = 1_0000;

export default defineEventHandler(async event => {
  const { dbConnectionString, schemaName, tableName, format } =
    await readBody<ExportTableDataRequest>(event);

  // ------------------------
  // Validation
  // ------------------------
  if (!schemaName || typeof schemaName !== 'string') {
    throw createError({ statusCode: 400, message: 'Invalid schema name' });
  }

  if (!tableName || typeof tableName !== 'string') {
    throw createError({ statusCode: 400, message: 'Invalid table name' });
  }

  if (!dbConnectionString || typeof dbConnectionString !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Invalid database connection string',
    });
  }

  if (!Object.values(ExportDataFormat).includes(format)) {
    throw createError({
      statusCode: 400,
      message: `Invalid format. Must be one of: ${Object.values(
        ExportDataFormat
      ).join(', ')}`,
    });
  }

  // ------------------------
  // DB & headers
  // ------------------------
  const pool = await getPgPool({
    dbConnectionString,
    type: 'postgres',
  });

  const contentTypes: Record<ExportDataFormat, string> = {
    [ExportDataFormat.SQL]: 'application/sql',
    [ExportDataFormat.JSON]: 'application/json',
    [ExportDataFormat.CSV]: 'text/csv',
  };

  const timestamp = dayjs().format('YYYY-MM-DD_HH-mm');

  setResponseHeaders(event, {
    'Content-Type': contentTypes[format],
    'Content-Disposition': `attachment; filename="${tableName}_${timestamp}.${format}"`,
    'Transfer-Encoding': 'chunked',
  });

  // ------------------------
  // Load columns
  // ------------------------
  const columnsResult = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position
    `,
    [schemaName, tableName]
  );

  const columns: string[] = columnsResult.rows.map(
    (r: { column_name: string }) => r.column_name
  );

  if (!columns.length) {
    throw createError({
      statusCode: 404,
      message: `Table ${schemaName}.${tableName} not found`,
    });
  }

  // ------------------------
  // Streaming
  // ------------------------
  if (format === ExportDataFormat.CSV) {
    const client = await pool.connect();
    try {
      const sql = `COPY "${schemaName}"."${tableName}" TO STDOUT WITH (FORMAT CSV, HEADER)`;
      const stream = client.query(to(sql));

      stream.on('finish', () => {
        client.release();
      });

      stream.on('error', (err: Error) => {
        console.error('CSV stream error:', err);
        client.release();
      });

      return stream;
    } catch (err) {
      client.release();
      throw err;
    }
  }

  // ------------------------
  // Format handlers
  // ------------------------
  const formatHandlers: Record<
    ExportDataFormat,
    {
      header?: () => string;
      row: (row: Record<string, unknown>, isFirst: boolean) => string;
      footer?: (totalRows: number) => string;
    }
  > = {
    [ExportDataFormat.JSON]: {
      header: () => '[\n',
      row: (row, isFirst) => (isFirst ? '' : ',\n') + JSON.stringify(row),
      footer: () => '\n]',
    },

    [ExportDataFormat.CSV]: {
      header: () => columns.map(escapeCSVValue).join(',') + '\n',
      row: row => generateCSVRow(columns, row),
    },

    [ExportDataFormat.SQL]: {
      // SQL uses batch processing, these are not used directly
      row: () => '',
    },
  };

  const handler = formatHandlers[format];

  const stream = new Readable({ read() {} });

  // SQL format uses batch processing for efficiency
  if (format === ExportDataFormat.SQL) {
    (async () => {
      const client = await pool.connect();

      try {
        const queryStream = new QueryStream(
          `SELECT * FROM "${schemaName}"."${tableName}"`,
          [],
          { batchSize: BATCH_SIZE }
        );

        const dbStream = client.query(queryStream);

        stream.push(
          `-- Export of ${schemaName}.${tableName}\n-- Generated at ${new Date().toISOString()}\n\n`
        );

        let batch: Record<string, unknown>[] = [];
        let totalRows = 0;

        for await (const row of dbStream) {
          batch.push(row);
          totalRows++;

          if (batch.length >= SQL_BATCH_SIZE) {
            stream.push(
              generateSQLBatch(schemaName, tableName, columns, batch)
            );
            batch = [];
          }
        }

        // Emit remaining rows
        if (batch.length > 0) {
          stream.push(generateSQLBatch(schemaName, tableName, columns, batch));
        }

        stream.push(`\n-- Total rows exported: ${totalRows}\n`);
        stream.push(null);
      } catch (err) {
        stream.destroy(err as Error);
      } finally {
        client.release();
      }
    })();

    return stream;
  }

  // JSON format streaming
  (async () => {
    const client = await pool.connect();

    try {
      const queryStream = new QueryStream(
        `SELECT * FROM "${schemaName}"."${tableName}"`,
        [],
        { batchSize: BATCH_SIZE }
      );

      const dbStream = client.query(queryStream);

      let isFirstRow = true;
      let totalRows = 0;

      if (handler.header) {
        stream.push(handler.header());
      }

      for await (const row of dbStream) {
        totalRows++;
        stream.push(handler.row(row, isFirstRow));
        isFirstRow = false;
      }

      if (handler.footer) {
        stream.push(handler.footer(totalRows));
      }

      stream.push(null);
    } catch (err) {
      stream.destroy(err as Error);
    } finally {
      client.release();
    }
  })();

  return stream;
});

/* ======================================================
 * Helpers
 * ====================================================== */

/**
 * Generates a batched INSERT statement with multiple VALUES tuples
 */
function generateSQLBatch(
  schemaName: string,
  tableName: string,
  columns: string[],
  rows: Record<string, unknown>[]
): string {
  const cols = columns.map(c => `"${c}"`).join(', ');
  const values = rows
    .map(row => `(${formatSQLValues(columns, row)})`)
    .join(',\n');

  return `INSERT INTO "${schemaName}"."${tableName}" (${cols}) VALUES\n${values};\n\n`;
}

/**
 * Formats a row's values for SQL INSERT
 */
function formatSQLValues(
  columns: string[],
  row: Record<string, unknown>
): string {
  return columns
    .map(col => {
      const value = row[col];
      if (value === null || value === undefined) return 'NULL';
      if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
      if (value instanceof Date) return `'${value.toISOString()}'`;
      if (typeof value === 'object')
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      return `'${String(value).replace(/'/g, "''")}'`;
    })
    .join(', ');
}

function generateCSVRow(
  columns: string[],
  row: Record<string, unknown>
): string {
  return (
    columns
      .map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object')
          return escapeCSVValue(JSON.stringify(value));
        return escapeCSVValue(String(value));
      })
      .join(',') + '\n'
  );
}

function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
