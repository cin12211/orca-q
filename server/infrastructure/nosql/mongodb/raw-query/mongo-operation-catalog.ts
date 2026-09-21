export const MONGO_COLLECTION_READ_METHODS = [
  'findOne',
  'countDocuments',
  'estimatedDocumentCount',
  'distinct',
  'options',
  'isCapped',
  'indexExists',
  'indexInformation',
] as const;

export const MONGO_COLLECTION_CURSOR_SOURCE_METHODS = [
  'find',
  'aggregate',
  'listIndexes',
] as const;

export const MONGO_DATABASE_CURSOR_SOURCE_METHODS = [
  'listCollections',
] as const;

export const MONGO_DATABASE_METHODS = [
  'collection',
  'command',
  'getSiblingDB',
] as const;

export const MONGO_COLLECTION_WRITE_METHODS = [
  'insertOne',
  'insertMany',
  'replaceOne',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'bulkWrite',
  'createIndex',
  'createIndexes',
  'dropIndex',
  'dropIndexes',
  'rename',
  'drop',
] as const;

export const MONGO_CURSOR_MODIFIERS_BY_SOURCE = {
  find: [
    'sort',
    'project',
    'skip',
    'limit',
    'batchSize',
    'hint',
    'collation',
    'maxTimeMS',
    'comment',
  ],
  aggregate: ['batchSize', 'maxTimeMS', 'allowDiskUse', 'comment'],
  listIndexes: ['batchSize', 'maxTimeMS'],
  listCollections: ['batchSize', 'maxTimeMS'],
} as const;

export const MONGO_READ_COMMANDS = [
  'ping',
  'dbStats',
  'collStats',
  'count',
  'distinct',
] as const;

export const MONGO_WRITE_COMMANDS = [
  'create',
  'drop',
  'createIndexes',
  'dropIndexes',
  'collMod',
] as const;

export const MONGO_DESTRUCTIVE_COLLECTION_METHODS = new Set([
  'deleteMany',
  'drop',
  'dropIndexes',
  'rename',
]);

export const MONGO_DESTRUCTIVE_COMMANDS = new Set(['drop', 'dropIndexes']);

export const isMongoCollectionMethod = (method: string) =>
  [
    ...MONGO_COLLECTION_READ_METHODS,
    ...MONGO_COLLECTION_CURSOR_SOURCE_METHODS,
    ...MONGO_COLLECTION_WRITE_METHODS,
  ].includes(method as never);

export const isMongoCursorSourceMethod = (method: string) =>
  (MONGO_COLLECTION_CURSOR_SOURCE_METHODS as readonly string[]).includes(
    method
  ) ||
  (MONGO_DATABASE_CURSOR_SOURCE_METHODS as readonly string[]).includes(method);

export const isMongoWriteMethod = (method: string) =>
  (MONGO_COLLECTION_WRITE_METHODS as readonly string[]).includes(method);

export const isMongoWriteCommand = (command: string) =>
  (MONGO_WRITE_COMMANDS as readonly string[]).includes(command);
