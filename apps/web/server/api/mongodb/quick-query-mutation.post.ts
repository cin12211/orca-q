import { createError, defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import {
  buildMongoDocumentSelector,
  normalizeMongoDocument,
  serializeMongoDocument,
  serializeMongoValue,
} from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface RequestBody extends DatabaseMetadataRequestParams {
  collection: string;
  operation: 'insert' | 'update' | 'delete';
  id?: unknown;
  document?: Record<string, unknown> | Record<string, unknown>[];
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);
  if (!body.collection || !body.operation)
    throw createError({
      statusCode: 400,
      message: 'collection and operation are required',
    });

  try {
    return await withMongoDatabase(body, async database => {
      const collection = database.collection(body.collection);
      if (body.operation === 'insert') {
        if (!body.document)
          throw createError({
            statusCode: 400,
            message: 'document is required',
          });

        if (Array.isArray(body.document)) {
          if (body.document.length === 0) {
            throw createError({
              statusCode: 400,
              message: 'document array cannot be empty',
            });
          }
          const normalizedDocs = body.document.map(doc =>
            normalizeMongoDocument(doc)
          );
          const result = await collection.insertMany(normalizedDocs);
          return {
            insertedCount: result.insertedCount,
            ids: Object.values(result.insertedIds).map(serializeMongoValue),
          };
        }

        const result = await collection.insertOne(
          normalizeMongoDocument(body.document)
        );
        return { id: serializeMongoValue(result.insertedId) };
      }
      if (body.id === undefined)
        throw createError({
          statusCode: 400,
          message: 'document id is required',
        });
      const selector = buildMongoDocumentSelector(body.id);
      if (body.operation === 'delete')
        return {
          deletedCount: (await collection.deleteOne(selector)).deletedCount,
        };
      if (!body.document || Array.isArray(body.document))
        throw createError({
          statusCode: 400,
          message: 'document must be an object for update operation',
        });
      const { _id: _ignored, ...updates } = body.document;
      const result = await collection.findOneAndUpdate(
        selector,
        { $set: normalizeMongoDocument(updates) },
        { returnDocument: 'after' }
      );
      return { document: result ? serializeMongoDocument(result) : null };
    });
  } catch (error: any) {
    if (error?.statusCode) throw error;
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to execute MongoDB mutation',
    });
  }
});
