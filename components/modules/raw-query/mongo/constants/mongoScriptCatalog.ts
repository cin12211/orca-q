import type { Completion } from '@codemirror/autocomplete';

export interface MongoScriptCatalogEntry {
  label: string;
  type: string;
  detail: string;
  info?: Completion['info'];
  requiresConfirmation?: boolean;
}

export const MONGO_SCRIPT_COLLECTION_METHODS: MongoScriptCatalogEntry[] = [
  { label: 'find', type: 'method', detail: '(filter?, options?) => Cursor' },
  {
    label: 'findOne',
    type: 'method',
    detail: '(filter?, options?) => Promise<Document>',
  },
  {
    label: 'aggregate',
    type: 'method',
    detail: '(pipeline, options?) => Cursor',
  },
  {
    label: 'countDocuments',
    type: 'method',
    detail: '(filter?) => Promise<number>',
  },
  {
    label: 'insertOne',
    type: 'method',
    detail: '(document) => Promise<InsertOneResult>',
    requiresConfirmation: true,
  },
  {
    label: 'insertMany',
    type: 'method',
    detail: '(documents) => Promise<InsertManyResult>',
    requiresConfirmation: true,
  },
  {
    label: 'updateOne',
    type: 'method',
    detail: '(filter, update) => Promise<UpdateResult>',
    requiresConfirmation: true,
  },
  {
    label: 'updateMany',
    type: 'method',
    detail: '(filter, update) => Promise<UpdateResult>',
    requiresConfirmation: true,
  },
  {
    label: 'deleteOne',
    type: 'method',
    detail: '(filter) => Promise<DeleteResult>',
    requiresConfirmation: true,
  },
  {
    label: 'deleteMany',
    type: 'method',
    detail: '(filter) => Promise<DeleteResult>',
    requiresConfirmation: true,
  },
];

export const MONGO_SCRIPT_DATABASE_METHODS: MongoScriptCatalogEntry[] = [
  { label: 'collection', type: 'method', detail: '(name) => Collection' },
  { label: 'getSiblingDB', type: 'method', detail: '(name) => Database' },
  {
    label: 'command',
    type: 'method',
    detail: '(command) => Promise<Document>',
  },
  { label: 'listCollections', type: 'method', detail: '() => Cursor' },
];

export const MONGO_SCRIPT_BSON_HELPERS: MongoScriptCatalogEntry[] = [
  { label: 'ObjectId', type: 'class', detail: 'BSON ObjectId constructor' },
  { label: 'Decimal128', type: 'class', detail: 'BSON Decimal128 constructor' },
  { label: 'Binary', type: 'class', detail: 'BSON Binary constructor' },
  { label: 'UUID', type: 'class', detail: 'BSON UUID constructor' },
];

export const MONGO_SCRIPT_PLACEHOLDER = `/*
 * OrcaQ initializes these variables and helpers for MongoDB raw queries.
 *
 * Runtime variables:
 * - db: database handle for the active database.
 * db is initialized with the active MongoDB database.
 * - database: alias created in this example with getSiblingDB().
 * - collection: collection handle created in this example.
 * - console: use console.log/info/warn/error(value) to debug; output appears
 *   in the Console result tab in execution order.
 *
 * BSON helpers:
 * ObjectId, Long, Int32, Double, Decimal128, Binary, UUID, Timestamp, BSON,
 * and EJSON are available for preserving MongoDB BSON types.
 *
 * Docs:
 * Database and collection API:
 * https://www.mongodb.com/docs/drivers/node/current/databases-collections/
 * Query methods:
 * https://www.mongodb.com/docs/drivers/node/current/crud/query/retrieve/
 * BSON and Extended JSON:
 * https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/
 *
 * Replace DATABASE and COLLECTION with the suggested names, then return a
 * cursor, document, scalar, or plain value to show it in the Results tab.
 */
const database = db.getSiblingDB('DATABASE');
const collection = database.collection('COLLECTION');
return collection.find({});`;

export const getMongoScriptPlaceholder = (
  databaseName?: string,
  collectionName?: string
) =>
  MONGO_SCRIPT_PLACEHOLDER.replace(
    'DATABASE',
    databaseName || '<database_name>'
  ).replace('COLLECTION', collectionName || '<collection_name>');
