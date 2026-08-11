import { createError, defineEventHandler, readBody } from 'h3';
import type { DatabaseMetadataRequestParams } from '~/core/types/database-schemas.types';
import {
  buildMongoDocumentSelector,
  serializeMongoDocument,
} from '~/server/infrastructure/nosql/mongodb/mongodb-quick-query';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

interface RequestBody extends DatabaseMetadataRequestParams {
  collection: string;
  operation: 'insert' | 'update' | 'delete';
  id?: string;
  document?: Record<string, unknown>;
}

export default defineEventHandler(async event => {
  const body = await readBody<RequestBody>(event);
  if (!body.collection || !body.operation)
    throw createError({
      statusCode: 400,
      message: 'collection and operation are required',
    });

  return await withMongoDatabase(body, async database => {
    const collection = database.collection(body.collection);
    if (body.operation === 'insert') {
      if (!body.document)
        throw createError({ statusCode: 400, message: 'document is required' });
      const result = await collection.insertOne(body.document);
      return { id: result.insertedId.toHexString() };
    }
    if (!body.id)
      throw createError({
        statusCode: 400,
        message: 'document id is required',
      });
    const selector = buildMongoDocumentSelector(body.id);
    if (body.operation === 'delete')
      return {
        deletedCount: (await collection.deleteOne(selector)).deletedCount,
      };
    if (!body.document)
      throw createError({ statusCode: 400, message: 'document is required' });
    const { _id: _ignored, ...updates } = body.document;
    const result = await collection.findOneAndUpdate(
      selector,
      { $set: updates },
      { returnDocument: 'after' }
    );
    return { document: result ? serializeMongoDocument(result) : null };
  });
});
