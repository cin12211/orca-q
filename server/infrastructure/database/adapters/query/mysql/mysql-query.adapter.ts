import { createError, type H3Event } from 'h3';
import type { FieldPacket } from 'mysql2';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~/core/helpers';
import type {
  DatabaseDriverError,
  DatabaseField,
  QueryResult,
  RawQueryResultWithMetadata,
} from '~/core/types';
import { normalizeMysqlFields } from '~/server/infrastructure/driver/mysql.adapter';
import { BaseDomainAdapter } from '../../shared';
import type {
  DatabaseQueryAdapterParams,
  IDatabaseQueryAdapter,
} from '../types';

const STREAM_BATCH_SIZE = 10_000;

function createSyntheticFields(columnNames: string[]): DatabaseField[] {
  return columnNames.map((name, index) => ({
    name,
    tableID: 0,
    columnID: index,
    dataTypeID: 0,
    dataTypeSize: 0,
    dataTypeModifier: 0,
    format: 'text',
  }));
}

function mapArrayRowsToObjects(
  rows: unknown[][],
  fields: DatabaseField[]
): Record<string, unknown>[] {
  return rows.map(row =>
    Object.fromEntries(fields.map((field, index) => [field.name, row[index]]))
  );
}

export class MysqlQueryAdapter
  extends BaseDomainAdapter
  implements IDatabaseQueryAdapter
{
  readonly dbType: DatabaseClientType;

  constructor(
    adapter: Awaited<ReturnType<typeof MysqlQueryAdapter.resolveAdapter>>,
    dbType: DatabaseClientType
  ) {
    super(adapter);
    this.dbType = dbType;
  }

  static async create(
    params: DatabaseQueryAdapterParams,
    dbType: DatabaseClientType = DatabaseClientType.MYSQL
  ): Promise<MysqlQueryAdapter> {
    const adapter = await MysqlQueryAdapter.resolveAdapter(params, dbType);
    return new MysqlQueryAdapter(adapter, dbType);
  }

  async execute(query: string): Promise<QueryResult> {
    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawQuery<Record<string, unknown>>(query)
    );

    return {
      result,
      queryTime,
    };
  }

  async rawExecute(
    query: string,
    params?: any[] | Record<string, any>
  ): Promise<RawQueryResultWithMetadata> {
    const mappingParams: Record<string, any> = {};

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          mappingParams[key] = this.adapter.knex.raw(
            value.map(() => '?').join(', '),
            value
          );
        } else {
          mappingParams[key] = value;
        }
      }
    }

    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawOut<unknown[]>(query, mappingParams as any[])
    );

    const fields = (result.fields ?? []) as DatabaseField[];

    return {
      rows: mapArrayRowsToObjects(result.rows, fields),
      fields,
      queryTime,
    };
  }

  async rawExecuteStream(
    event: H3Event,
    query: string,
    params?: Record<string, unknown>
  ): Promise<void> {
    const res = event.node.res;

    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const mappingParams: Record<string, any> = {};

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          mappingParams[key] = this.adapter.knex.raw(
            value.map(() => '?').join(', '),
            value
          );
        } else {
          mappingParams[key] = value;
        }
      }
    }

    const trimmedQuery = query.trim().toUpperCase();
    const isSelectLike =
      trimmedQuery.startsWith('SELECT') ||
      trimmedQuery.startsWith('WITH') ||
      trimmedQuery.startsWith('SHOW') ||
      trimmedQuery.startsWith('DESCRIBE') ||
      trimmedQuery.startsWith('EXPLAIN');

    const writeLine = (data: Record<string, unknown>) => {
      res.write(JSON.stringify(data) + '\n');
    };

    const startTime = performance.now();

    if (!isSelectLike) {
      const result = await this.rawExecute(query, params);

      writeLine({
        type: 'meta',
        fields: result.fields,
        command: trimmedQuery.split(/\s+/, 1)[0] || 'QUERY',
      });

      if (result.rows.length > 0) {
        writeLine({ type: 'rows', data: result.rows });
      }

      writeLine({
        type: 'done',
        rowCount: result.rows.length,
        queryTime: result.queryTime,
      });

      res.end();
      return;
    }

    const { sql, bindings } = this.adapter.getNativeSql(
      query,
      mappingParams || {}
    );

    const client = await this.adapter.acquireRawConnection();
    const queryHandle = client.query({
      sql,
      values: bindings,
      rowsAsArray: true,
    });
    const stream = queryHandle.stream();

    let metaSent = false;
    let rowCount = 0;
    let batch: unknown[][] = [];

    try {
      queryHandle.on('fields', (fields: FieldPacket[]) => {
        if (metaSent) return;
        metaSent = true;
        writeLine({
          type: 'meta',
          fields: normalizeMysqlFields(fields),
          command: trimmedQuery.split(/\s+/, 1)[0] || 'SELECT',
        });
      });

      for await (const row of stream) {
        if (!metaSent) {
          const fieldNames = Array.isArray(row)
            ? row.map((_, index) => `column_${index + 1}`)
            : Object.keys(row as Record<string, unknown>);
          metaSent = true;
          writeLine({
            type: 'meta',
            fields: createSyntheticFields(fieldNames),
            command: trimmedQuery.split(/\s+/, 1)[0] || 'SELECT',
          });
        }

        batch.push(row as unknown[]);
        rowCount++;

        if (batch.length >= STREAM_BATCH_SIZE) {
          writeLine({ type: 'rows', data: batch });
          batch = [];
        }
      }

      if (!metaSent) {
        metaSent = true;
        writeLine({
          type: 'meta',
          fields: [],
          command: trimmedQuery.split(/\s+/, 1)[0] || 'SELECT',
        });
      }

      if (batch.length > 0) {
        writeLine({ type: 'rows', data: batch });
      }

      const endTime = performance.now();
      writeLine({
        type: 'done',
        rowCount,
        queryTime: Number((endTime - startTime).toFixed(2)),
      });
      res.end();
    } catch (error: any) {
      const payloadError = {
        dbType: this.dbType,
        ...error,
      } as DatabaseDriverError;
      const normalizeError = new ErrorNormalizer(payloadError)
        .nomaltliztionErrror;

      writeLine({
        type: 'error',
        message: error?.message || 'Unknown query error',
        error: {
          ...payloadError,
          normalizeError: {
            dbType: this.dbType,
            ...normalizeError,
          },
        },
      });
      res.end();
    } finally {
      stream.destroy();
      await this.adapter.releaseRawConnection(client);
    }
  }
}
