import { createError, defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import {
  normalizeMongoFilter,
  serializeMongoDocument,
} from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface RequestBody extends DatabaseMetadataRequestParams {
  collection: string;
  filter?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);
  if (!body.collection || body.collection.startsWith('$')) {
    throw createError({
      statusCode: 400,
      message: 'A valid collection is required',
    });
  }

  const limit = Math.min(Math.max(body.limit ?? 100, 1), 500);
  const skip = Math.max(body.skip ?? 0, 0);
  let filter: Record<string, unknown>;
  try {
    filter = normalizeMongoFilter(body.filter);
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message:
        error instanceof Error ? error.message : 'Invalid MongoDB filter',
    });
  }

  const startedAt = performance.now();

  try {
    const result = await withMongoDatabase(body, async database => {
      const collection = database.collection(body.collection);
      const [documents, total] = await Promise.all([
        collection
          .find(filter)
          .sort(body.sort ?? { _id: 1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(filter),
      ]);
      return {
        documents: documents.map(document => serializeMongoDocument(document)),
        total,
      };
    });

    return {
      ...result,
      queryTime: Number((performance.now() - startedAt).toFixed(2)),
    };
  } catch (error: any) {
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to execute MongoDB query',
    });
  }
});
