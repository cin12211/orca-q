import type {
  MongoRawQueryMetadata,
  MongoRawQueryMetadataRequest,
} from '~/core/types/mongodb-raw-query.types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isEjsonScalar = (value: Record<string, unknown>) =>
  Object.keys(value).some(key => key.startsWith('$'));

export function extractMongoJsonSchemaFieldPaths(
  schema: unknown,
  maxDepth = 2
): string[] {
  const fields = new Set<string>();
  const visit = (value: unknown, prefix: string, depth: number) => {
    if (!isRecord(value) || depth > maxDepth) return;
    const properties = value.properties;
    if (!isRecord(properties)) return;
    for (const [key, nested] of Object.entries(properties)) {
      const path = prefix ? `${prefix}.${key}` : key;
      fields.add(path);
      if (depth < maxDepth) visit(nested, path, depth + 1);
    }
  };
  visit(schema, '', 1);
  return [...fields].sort();
}

export function inferMongoFieldPaths(
  documents: unknown[],
  maxDepth = 2
): string[] {
  const fields = new Set<string>();
  const visit = (value: unknown, prefix: string, depth: number) => {
    if (!isRecord(value) || depth > maxDepth) return;
    for (const [key, nested] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      fields.add(path);
      if (depth < maxDepth && isRecord(nested) && !isEjsonScalar(nested))
        visit(nested, path, depth + 1);
    }
  };
  documents.forEach(document => visit(document, '', 1));
  return [...fields].sort();
}

export async function getMongoRawQueryMetadata(
  request: MongoRawQueryMetadataRequest
): Promise<MongoRawQueryMetadata> {
  const [
    { withMongoDatabase },
    { getMongoCollectionValidation, listMongoCollectionNames },
  ] = await Promise.all([
    import('../mongodb.client'),
    import('../mongodb-quick-query'),
  ]);
  return withMongoDatabase(request, async database => {
    const collections = (await listMongoCollectionNames(database))
      .map(item => item.name)
      .sort();
    const fieldsByCollection: Record<string, string[]> = {};
    if (
      request.collectionContext &&
      collections.includes(request.collectionContext)
    ) {
      const validation = await getMongoCollectionValidation(
        database,
        request.collectionContext
      );
      const samples = await database
        .collection(request.collectionContext)
        .find({})
        .limit(20)
        .toArray();
      fieldsByCollection[request.collectionContext] = [
        ...new Set([
          ...extractMongoJsonSchemaFieldPaths(validation.validator, 2),
          ...inferMongoFieldPaths(samples, 2),
        ]),
      ].sort();
    }
    return { collections, fieldsByCollection };
  });
}
