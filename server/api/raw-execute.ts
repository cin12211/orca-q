import { readBody, defineEventHandler, createError } from 'h3';
import type { FieldDef } from 'pg';
import { type QueryFailedError } from 'typeorm';
import { getPgPool } from '../utils/db-row-connection';

interface QueryResultWithMetadata {
  rows: Record<string, any>[];
  fields: FieldDef[];
  queryTime: number;
}

export default defineEventHandler(
  async (event): Promise<QueryResultWithMetadata> => {
    try {
      const body: { query: string; dbConnectionString: string } =
        await readBody(event);

      const startTime = performance.now();
      const connection = await getPgPool({
        dbConnectionString: body.dbConnectionString,
        type: 'postgres',
      });

      const result = await connection.query({
        text: body.query,
        rowMode: 'array',
      });

      const fields: FieldDef[] = result.fields;
      const rows: unknown[][] = result.rows;

      const endTime = performance.now();
      const queryTime = Number((endTime - startTime).toFixed(2));

      return { rows, queryTime, fields };
    } catch (error) {
      const queryError: QueryFailedError = error as any;

      throw createError({
        statusCode: 500,
        statusMessage: queryError.message,
        cause: queryError.cause,
        data: JSON.stringify(error, null, 2),
        message: queryError.message,
      });
    }
  }
);

/* 
import JSONStream from 'JSONStream';
import { FieldDef } from 'pg';
import Cursor from 'pg-cursor';
import QueryStream from 'pg-query-stream';
import { type QueryFailedError } from 'typeorm';
import { getPgPool } from '../utils/db-row-connection';

export default defineEventHandler(
  async (
    event
  ): Promise<{
    result: Record<string, any>[];
    queryTime: number;
    rows: unknown[][];
    fields: FieldDef[];
  }> => {
    try {
      const body: { query: string; dbConnectionString: string } =
        await readBody(event);

      const startTime = performance.now();
      const connection = await getPgPool({
        dbConnectionString: body.dbConnectionString,
        type: 'postgres',
      });

      setHeader(event, 'Content-Type', 'application/json; charset=utf-8');

      const stream = new ReadableStream({
        async start(controller) {
          connection.connect((err, client, done) => {
            if (err) throw err;

            const queryStream = new QueryStream(body.query, [], {
              batchSize: 50,
              rowMode: 'array',
            });

            const stream = client.query(queryStream);

            // release the client when the stream is finished
            stream.on('end', () => {
              done();
              controller.close();
            });

            // stream.pipe(JSONStream.stringify()).pipe(event.node.res);

            stream.on('data', chunk => {
              // console.log('🚀 ~ start ~ chunk:', chunk);

              const row = JSON.stringify(chunk) + '\n';
              controller.enqueue(new TextEncoder().encode(row));

              // controller.enqueue(new TextEncoder().encode(chunk));
            });

            stream.on('error', err => {
              controller.error(err);
            });
          });
        },
      });

      return stream;

      // console.log('🚀 ~ queryStream:', queryStream);

      // pipe 1,000,000 rows to stdout without blowing up your memory usage
      connection.connect((err, client, done) => {
        if (err) throw err;

        const queryStream = new QueryStream(body.query, [], {
          batchSize: 250,
          rowMode: 'array',
          highWaterMark: 1000,
        });

        const stream = client.query(queryStream);
        console.log('🚀 ~ stream:', stream);

        // release the client when the stream is finished
        stream.on('end', done);

        stream.pipe(JSONStream.stringify()).pipe(event.node.res);

        // stream.on('data', data => {
        //   console.log('data:::', data);
        // });
        // stream.pipe(e => {
        //   console.log('e:::', e);
        // });
      });

      // const stream = connection.query(queryStream);
      // // release the client when the stream is finished
      // stream.on('end', done);
      // stream.pipe(JSONStream.stringify()).pipe(process.stdout);

      // const result = await connection.query({
      //   text: body.query,
      //   rowMode: 'array',
      // });

      // const fields: FieldDef[] = result.fields;
      // const rows: unknown[][] = result.rows;

      // // fetch metadata
      // // const { tableOidToName, typeOidToName } = await fetchMetadata(
      // //   connection,
      // //   fields
      // // );

      // // build metadata
      // // const fieldsInfo = buildFieldsInfo(fields, tableOidToName, typeOidToName);
      // // const uniqueColumnNames = buildUniqueColumnNames(fieldsInfo);
      // // const rows = transformRows(result.rows, uniqueColumnNames);

      // // console.log('rows', fields);

      // const endTime = performance.now();
      // const queryTime = Number((endTime - startTime).toFixed(2));

      // return { result: rows, queryTime, rows, fields };
    } catch (error) {
      console.log('🚀 ~ error:', error);
      const queryError: QueryFailedError = error as any;
      throw createError({
        statusCode: 500,
        statusMessage: queryError.message,
        cause: queryError.cause,
        data: queryError.driverError,
        message: queryError.message,
      });
    }
  }
);
*/
