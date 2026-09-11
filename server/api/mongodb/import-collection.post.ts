import { createError, defineEventHandler, readMultipartFormData } from 'h3';
import { BSON } from 'mongodb';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

export default defineEventHandler(async event => {
  const parts = await readMultipartFormData(event);
  if (!parts?.length) {
    throw createError({ statusCode: 400, message: 'No file or form data uploaded' });
  }

  let connectionId = '';
  let databaseName = '';
  let collectionName = '';
  let fileBuffer: Buffer | null = null;
  let fileName = '';

  for (const part of parts) {
    if (part.name === 'connectionId') connectionId = part.data.toString('utf-8');
    if (part.name === 'database') databaseName = part.data.toString('utf-8');
    if (part.name === 'collection') collectionName = part.data.toString('utf-8');
    if (part.name === 'file' && part.filename) {
      fileBuffer = part.data;
      fileName = part.filename;
    }
  }

  if (!collectionName || !fileBuffer) {
    throw createError({
      statusCode: 400,
      message: 'collection and file are required',
    });
  }

  const fileContent = fileBuffer.toString('utf-8');
  let docsToInsert: Record<string, unknown>[] = [];

  if (fileName.endsWith('.json')) {
    try {
      const parsed = BSON.EJSON.parse(fileContent);
      docsToInsert = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Parse newline-delimited JSON (NDJSON)
      const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
      docsToInsert = lines.map(line => BSON.EJSON.parse(line));
    }
  } else if (fileName.endsWith('.csv')) {
    const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 1) {
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const doc: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          doc[header] = row[index] ?? null;
        });
        docsToInsert.push(doc);
      }
    }
  } else {
    throw createError({ statusCode: 400, message: 'Only .json and .csv files are supported' });
  }

  if (!docsToInsert.length) {
    throw createError({ statusCode: 400, message: 'No documents found in uploaded file' });
  }

  return await withMongoDatabase(
    { connectionId, database: databaseName } as any,
    async database => {
      const collection = database.collection(collectionName);
      const result = await collection.insertMany(docsToInsert as any, { ordered: false });
      return { success: true, insertedCount: result.insertedCount };
    }
  );
});
