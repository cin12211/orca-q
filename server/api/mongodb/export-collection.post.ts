import { createError, defineEventHandler, readBody, setHeader } from 'h3';
import { BSON } from 'mongodb';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import { normalizeMongoFilter } from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface ExportRequestBody extends DatabaseMetadataRequestParams {
  collection: string;
  scope: 'current' | 'all' | 'full';
  filter?: Record<string, unknown>;
  format: 'csv' | 'json';
  jsonFormat?: 'default' | 'relaxed' | 'canonical';
}

export default defineEventHandler(async event => {
  const body = await readBody<ExportRequestBody>(event);
  if (!body.collection || !body.format) {
    throw createError({ statusCode: 400, message: 'collection and format are required' });
  }

  return await withMongoDatabase(body, async database => {
    const collection = database.collection(body.collection);
    const queryFilter =
      body.scope === 'current' && body.filter
        ? normalizeMongoFilter(body.filter)
        : {};

    const docs = await collection.find(queryFilter).toArray();

    if (body.format === 'json') {
      const isRelaxed = body.jsonFormat !== 'canonical';
      const output = BSON.EJSON.stringify(docs, undefined, 2, { relaxed: isRelaxed });
      setHeader(event, 'Content-Type', 'application/json');
      setHeader(
        event,
        'Content-Disposition',
        `attachment; filename="${body.collection}_export.json"`
      );
      return output;
    }

    // CSV format
    const allKeys = Array.from(
      new Set(docs.flatMap(d => Object.keys(d)))
    );
    const headerRow = allKeys.join(',');
    const rows = docs.map(doc => {
      return allKeys
        .map(key => {
          const val = doc[key];
          if (val === undefined || val === null) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvOutput = [headerRow, ...rows].join('\n');
    setHeader(event, 'Content-Type', 'text/csv');
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="${body.collection}_export.csv"`
    );
    return csvOutput;
  });
});
