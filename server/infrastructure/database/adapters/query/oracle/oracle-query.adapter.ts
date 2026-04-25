import { createError, type H3Event } from 'h3';
import * as oracledb from 'oracledb';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseDriverNormalizerError as ErrorNormalizer } from '~/core/helpers';
import type {
  DatabaseDriverError,
  DatabaseField,
  QueryResult,
  RawQueryResultWithMetadata,
} from '~/core/types';
import { normalizeOracleFields } from '~/server/infrastructure/driver/oracle.adapter';
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

export class OracleQueryAdapter
  extends BaseDomainAdapter
  implements IDatabaseQueryAdapter
{
  readonly dbType = DatabaseClientType.ORACLE;

  static async create(
    params: DatabaseQueryAdapterParams
  ): Promise<OracleQueryAdapter> {
    const adapter = await OracleQueryAdapter.resolveAdapter(
      params,
      DatabaseClientType.ORACLE
    );

    return new OracleQueryAdapter(adapter);
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

    if (params && !Array.isArray(params)) {
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

    const nativeSql = Array.isArray(params)
      ? { sql: query, bindings: params }
      : this.adapter.getNativeSql(query, mappingParams || {});
    const nativeBindings = Array.from(nativeSql.bindings ?? []) as any[];

    const { result, queryTime } = await this.withTiming(() =>
      this.adapter.rawOut<unknown[]>(nativeSql.sql, nativeBindings)
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

    const writeLine = (data: Record<string, unknown>) => {
      res.write(JSON.stringify(data) + '\n');
    };

    const startTime = performance.now();
    const { sql, bindings } = this.adapter.getNativeSql(
      query,
      mappingParams || {}
    );
    const trimmedQuery = sql.trim().toUpperCase();
    const isSelectLike =
      trimmedQuery.startsWith('SELECT') || trimmedQuery.startsWith('WITH');

    const client = await this.adapter.acquireRawConnection();

    try {
      if (!isSelectLike) {
        const result = await client.execute(sql, bindings, {
          outFormat: oracledb.OUT_FORMAT_ARRAY,
        });

        writeLine({
          type: 'meta',
          fields: normalizeOracleFields(result.metaData || []),
          command: trimmedQuery.split(/\s+/, 1)[0] || 'QUERY',
        });

        if (result.rows?.length > 0) {
          writeLine({ type: 'rows', data: result.rows });
        }

        writeLine({
          type: 'done',
          rowCount: result.rowsAffected ?? result.rows?.length ?? 0,
          queryTime: Number((performance.now() - startTime).toFixed(2)),
        });

        res.end();
        return;
      }

      const stream = client.queryStream(sql, bindings, {
        outFormat: oracledb.OUT_FORMAT_ARRAY,
        fetchArraySize: STREAM_BATCH_SIZE,
      });

      let metaSent = false;
      let rowCount = 0;
      let batch: unknown[][] = [];

      stream.on('metadata', (metadata: Array<{ name?: string }>) => {
        if (metaSent) return;
        metaSent = true;
        writeLine({
          type: 'meta',
          fields: normalizeOracleFields(metadata),
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

      writeLine({
        type: 'done',
        rowCount,
        queryTime: Number((performance.now() - startTime).toFixed(2)),
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
      await this.adapter.releaseRawConnection(client);
    }
  }
}
