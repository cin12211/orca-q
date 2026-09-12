import { createError, defineEventHandler, readMultipartFormData } from 'h3';
import { BSON } from 'mongodb';
import { withMongoDatabase } from '~/server/infrastructure/nosql/mongodb/mongodb.client';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export default defineEventHandler(async event => {
  const parts = await readMultipartFormData(event);
  if (!parts?.length) {
    throw createError({ statusCode: 400, message: 'No file or form data uploaded' });
  }

  const formFields: Record<string, string> = {};
  let fileBuffer: Buffer | null = null;
  let fileName = '';

  for (const part of parts) {
    if (part.name === 'file' && part.filename) {
      fileBuffer = part.data;
      fileName = part.filename;
    } else if (part.name) {
      formFields[part.name] = part.data.toString('utf-8');
    }
  }

  const collectionName = formFields.collection;
  const databaseName = formFields.database;

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
    const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 1) {
      const headers = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const row = parseCsvLine(lines[i]).map(c => c.replace(/^["']|["']$/g, ''));
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
    {
      ...formFields,
      database: databaseName,
    } as any,
    async database => {
      const collection = database.collection(collectionName);
      const BATCH_SIZE = 1000;
      let insertedCount = 0;

      for (let i = 0; i < docsToInsert.length; i += BATCH_SIZE) {
        const batch = docsToInsert.slice(i, i + BATCH_SIZE);
        const result = await collection.insertMany(batch as any, { ordered: false });
        insertedCount += result.insertedCount;
      }

      return { success: true, insertedCount };
    }
  );
});

