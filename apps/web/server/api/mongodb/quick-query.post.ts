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
  project?: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  collation?: Record<string, unknown>;
  hint?: string | Record<string, unknown>;
  maxTimeMS?: number;
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
      let cursor = collection.find(filter);

      if (body.project && Object.keys(body.project).length > 0) {
        cursor = cursor.project(body.project);
      }

      if (body.sort && Object.keys(body.sort).length > 0) {
        cursor = cursor.sort(body.sort);
      } else {
        cursor = cursor.sort({ _id: 1 });
      }

      if (body.collation && Object.keys(body.collation).length > 0) {
        cursor = cursor.collation(body.collation as any);
      }

      if (body.hint) {
        cursor = cursor.hint(body.hint as any);
      }

      if (body.maxTimeMS && body.maxTimeMS > 0) {
        cursor = cursor.maxTimeMS(body.maxTimeMS);
      }

      const [documents, total] = await Promise.all([
        cursor.skip(skip).limit(limit).toArray(),
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
