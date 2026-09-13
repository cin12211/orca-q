import type { Completion } from '@codemirror/autocomplete';
import { CompletionIcon } from '~/components/base/code-editor/constants';

export interface MongoScriptCatalogEntry {
  label: string;
  type: string;
  detail: string;
  info?: Completion['info'];
  requiresConfirmation?: boolean;
  boost?: number;
  category?:
    | 'database'
    | 'collection'
    | 'bson'
    | 'console'
    | 'keyword'
    | 'cursor';
}

export const MONGO_SCRIPT_COLLECTION_METHODS: MongoScriptCatalogEntry[] = [
  {
    label: 'find',
    type: CompletionIcon.Method,
    detail: '(filter?, options?) => Cursor',
    category: 'collection',
  },
  {
    label: 'findOne',
    type: CompletionIcon.Method,
    detail: '(filter?, options?) => Promise<Document>',
    category: 'collection',
  },
  {
    label: 'aggregate',
    type: CompletionIcon.Method,
    detail: '(pipeline, options?) => Cursor',
    category: 'collection',
  },
  {
    label: 'countDocuments',
    type: CompletionIcon.Method,
    detail: '(filter?) => Promise<number>',
    category: 'collection',
  },
  {
    label: 'estimatedDocumentCount',
    type: CompletionIcon.Method,
    detail: '(options?) => Promise<number>',
    category: 'collection',
  },
  {
    label: 'distinct',
    type: CompletionIcon.Method,
    detail: '(field, filter?) => Promise<any[]>',
    category: 'collection',
  },
  {
    label: 'listIndexes',
    type: CompletionIcon.Method,
    detail: '() => Cursor',
    category: 'collection',
  },
  {
    label: 'insertOne',
    type: CompletionIcon.Method,
    detail: '(document) => Promise<InsertOneResult>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'insertMany',
    type: CompletionIcon.Method,
    detail: '(documents) => Promise<InsertManyResult>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'updateOne',
    type: CompletionIcon.Method,
    detail: '(filter, update) => Promise<UpdateResult>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'updateMany',
    type: CompletionIcon.Method,
    detail: '(filter, update) => Promise<UpdateResult>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'replaceOne',
    type: CompletionIcon.Method,
    detail: '(filter, replacement) => Promise<UpdateResult>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'deleteOne',
    type: CompletionIcon.Method,
    detail: '(filter) => Promise<DeleteResult>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'deleteMany',
    type: CompletionIcon.Method,
    detail: '(filter) => Promise<DeleteResult>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'findOneAndUpdate',
    type: CompletionIcon.Method,
    detail: '(filter, update, options?) => Promise<Document>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'findOneAndDelete',
    type: CompletionIcon.Method,
    detail: '(filter, options?) => Promise<Document>',
    requiresConfirmation: true,
    category: 'collection',
  },
  {
    label: 'drop',
    type: CompletionIcon.Method,
    detail: '() => Promise<boolean>',
    requiresConfirmation: true,
    category: 'collection',
  },
];

export const MONGO_SCRIPT_DATABASE_METHODS: MongoScriptCatalogEntry[] = [
  {
    label: 'collection',
    type: CompletionIcon.Method,
    detail: '(name) => Collection',
    category: 'database',
  },
  {
    label: 'getSiblingDB',
    type: CompletionIcon.Method,
    detail: '(name) => Database',
    category: 'database',
  },
  {
    label: 'command',
    type: CompletionIcon.Method,
    detail: '(command) => Promise<Document>',
    category: 'database',
  },
  {
    label: 'listCollections',
    type: CompletionIcon.Method,
    detail: '() => Cursor',
    category: 'database',
  },
  {
    label: 'createCollection',
    type: CompletionIcon.Method,
    detail: '(name, options?) => Promise<Collection>',
    category: 'database',
  },
  {
    label: 'dropDatabase',
    type: CompletionIcon.Method,
    detail: '() => Promise<Document>',
    requiresConfirmation: true,
    category: 'database',
  },
];

export const MONGO_SCRIPT_CONSOLE_METHODS: MongoScriptCatalogEntry[] = [
  {
    label: 'log',
    type: CompletionIcon.Method,
    detail: '(...data: any[]) => void',
    boost: 95,
    category: 'console',
  },
  {
    label: 'info',
    type: CompletionIcon.Method,
    detail: '(...data: any[]) => void',
    boost: 90,
    category: 'console',
  },
  {
    label: 'warn',
    type: CompletionIcon.Method,
    detail: '(...data: any[]) => void',
    boost: 90,
    category: 'console',
  },
  {
    label: 'error',
    type: CompletionIcon.Method,
    detail: '(...data: any[]) => void',
    boost: 90,
    category: 'console',
  },
  {
    label: 'debug',
    type: CompletionIcon.Method,
    detail: '(...data: any[]) => void',
    boost: 85,
    category: 'console',
  },
  {
    label: 'table',
    type: CompletionIcon.Method,
    detail: '(tabularData: any, properties?: string[]) => void',
    boost: 85,
    category: 'console',
  },
  {
    label: 'time',
    type: CompletionIcon.Method,
    detail: '(label?: string) => void',
    boost: 80,
    category: 'console',
  },
  {
    label: 'timeEnd',
    type: CompletionIcon.Method,
    detail: '(label?: string) => void',
    boost: 80,
    category: 'console',
  },
  {
    label: 'trace',
    type: CompletionIcon.Method,
    detail: '(...data: any[]) => void',
    boost: 80,
    category: 'console',
  },
  {
    label: 'clear',
    type: CompletionIcon.Method,
    detail: '() => void',
    boost: 75,
    category: 'console',
  },
];

export const MONGO_SCRIPT_CURSOR_METHODS: MongoScriptCatalogEntry[] = [
  {
    label: 'toArray',
    type: CompletionIcon.Method,
    detail: '() => Promise<Document[]>',
    boost: 95,
    category: 'cursor',
  },
  {
    label: 'sort',
    type: CompletionIcon.Method,
    detail: '(sort: Document | string) => Cursor',
    boost: 90,
    category: 'cursor',
  },
  {
    label: 'limit',
    type: CompletionIcon.Method,
    detail: '(limit: number) => Cursor',
    boost: 90,
    category: 'cursor',
  },
  {
    label: 'skip',
    type: CompletionIcon.Method,
    detail: '(skip: number) => Cursor',
    boost: 90,
    category: 'cursor',
  },
  {
    label: 'project',
    type: CompletionIcon.Method,
    detail: '(projection: Document) => Cursor',
    boost: 85,
    category: 'cursor',
  },
  {
    label: 'count',
    type: CompletionIcon.Method,
    detail: '() => Promise<number>',
    boost: 85,
    category: 'cursor',
  },
  {
    label: 'batchSize',
    type: CompletionIcon.Method,
    detail: '(size: number) => Cursor',
    boost: 80,
    category: 'cursor',
  },
  {
    label: 'hint',
    type: CompletionIcon.Method,
    detail: '(hint: Document | string) => Cursor',
    boost: 80,
    category: 'cursor',
  },
  {
    label: 'maxTimeMS',
    type: CompletionIcon.Method,
    detail: '(ms: number) => Cursor',
    boost: 80,
    category: 'cursor',
  },
  {
    label: 'collation',
    type: CompletionIcon.Method,
    detail: '(collation: Document) => Cursor',
    boost: 75,
    category: 'cursor',
  },
  {
    label: 'comment',
    type: CompletionIcon.Method,
    detail: '(comment: string) => Cursor',
    boost: 75,
    category: 'cursor',
  },
  {
    label: 'next',
    type: CompletionIcon.Method,
    detail: '() => Promise<Document | null>',
    boost: 80,
    category: 'cursor',
  },
  {
    label: 'hasNext',
    type: CompletionIcon.Method,
    detail: '() => Promise<boolean>',
    boost: 80,
    category: 'cursor',
  },
  {
    label: 'close',
    type: CompletionIcon.Method,
    detail: '() => Promise<void>',
    boost: 70,
    category: 'cursor',
  },
];

export const MONGO_SCRIPT_BSON_HELPERS: MongoScriptCatalogEntry[] = [
  {
    label: 'ObjectId',
    type: CompletionIcon.Type,
    detail: 'BSON ObjectId constructor',
    category: 'bson',
  },
  {
    label: 'Decimal128',
    type: CompletionIcon.Type,
    detail: 'BSON Decimal128 constructor',
    category: 'bson',
  },
  {
    label: 'Binary',
    type: CompletionIcon.Type,
    detail: 'BSON Binary constructor',
    category: 'bson',
  },
  {
    label: 'UUID',
    type: CompletionIcon.Type,
    detail: 'BSON UUID constructor',
    category: 'bson',
  },
  {
    label: 'Long',
    type: CompletionIcon.Type,
    detail: 'BSON Long constructor',
    category: 'bson',
  },
  {
    label: 'Int32',
    type: CompletionIcon.Type,
    detail: 'BSON Int32 constructor',
    category: 'bson',
  },
  {
    label: 'Double',
    type: CompletionIcon.Type,
    detail: 'BSON Double constructor',
    category: 'bson',
  },
  {
    label: 'Timestamp',
    type: CompletionIcon.Type,
    detail: 'BSON Timestamp constructor',
    category: 'bson',
  },
];

export const MONGO_SCRIPT_EJSON_METHODS: MongoScriptCatalogEntry[] = [
  {
    label: 'parse',
    type: CompletionIcon.Method,
    detail: '(text: string, options?: any) => any',
    category: 'bson',
  },
  {
    label: 'stringify',
    type: CompletionIcon.Method,
    detail:
      '(value: any, replacer?: any, space?: any, options?: any) => string',
    category: 'bson',
  },
  {
    label: 'serialize',
    type: CompletionIcon.Method,
    detail: '(bson: any, options?: any) => any',
    category: 'bson',
  },
  {
    label: 'deserialize',
    type: CompletionIcon.Method,
    detail: '(ejson: any, options?: any) => any',
    category: 'bson',
  },
];

export const MONGO_SCRIPT_JSON_METHODS: MongoScriptCatalogEntry[] = [
  {
    label: 'parse',
    type: CompletionIcon.Method,
    detail: '(text: string, reviver?: Function) => any',
  },
  {
    label: 'stringify',
    type: CompletionIcon.Method,
    detail: '(value: any, replacer?: any, space?: any) => string',
  },
];

export const MONGO_SCRIPT_MATH_METHODS: MongoScriptCatalogEntry[] = [
  {
    label: 'round',
    type: CompletionIcon.Method,
    detail: '(x: number) => number',
  },
  {
    label: 'floor',
    type: CompletionIcon.Method,
    detail: '(x: number) => number',
  },
  {
    label: 'ceil',
    type: CompletionIcon.Method,
    detail: '(x: number) => number',
  },
  {
    label: 'max',
    type: CompletionIcon.Method,
    detail: '(...values: number[]) => number',
  },
  {
    label: 'min',
    type: CompletionIcon.Method,
    detail: '(...values: number[]) => number',
  },
  {
    label: 'abs',
    type: CompletionIcon.Method,
    detail: '(x: number) => number',
  },
  {
    label: 'random',
    type: CompletionIcon.Method,
    detail: '() => number',
  },
  {
    label: 'pow',
    type: CompletionIcon.Method,
    detail: '(x: number, y: number) => number',
  },
  {
    label: 'sqrt',
    type: CompletionIcon.Method,
    detail: '(x: number) => number',
  },
  {
    label: 'trunc',
    type: CompletionIcon.Method,
    detail: '(x: number) => number',
  },
];

export const MONGO_SCRIPT_TOP_LEVEL_HELPERS: MongoScriptCatalogEntry[] = [
  {
    label: 'db',
    type: CompletionIcon.Database,
    detail: 'Active database handle',
  },
  {
    label: 'console',
    type: CompletionIcon.Keyword,
    detail: 'Console output logger',
  },
  {
    label: 'params',
    type: CompletionIcon.Variable,
    detail: 'Injected variables',
  },
  {
    label: 'BSON',
    type: CompletionIcon.Type,
    detail: 'BSON namespace',
  },
  {
    label: 'EJSON',
    type: CompletionIcon.Type,
    detail: 'EJSON serializer/deserializer',
  },
];

export const MONGO_SCRIPT_JS_KEYWORDS: MongoScriptCatalogEntry[] = [
  {
    label: 'return',
    type: CompletionIcon.Keyword,
    detail: 'return <expression>; // output results',
    boost: 95,
  },
  {
    label: 'const',
    type: CompletionIcon.Keyword,
    detail: 'const <name> = <value>;',
    boost: 85,
  },
  {
    label: 'let',
    type: CompletionIcon.Keyword,
    detail: 'let <name> = <value>;',
    boost: 85,
  },
  {
    label: 'var',
    type: CompletionIcon.Keyword,
    detail: 'var <name> = <value>;',
    boost: 70,
  },
  {
    label: 'await',
    type: CompletionIcon.Keyword,
    detail: 'await <promise>;',
    boost: 85,
  },
  {
    label: 'async',
    type: CompletionIcon.Keyword,
    detail: 'async function or arrow function',
    boost: 80,
  },
  {
    label: 'function',
    type: CompletionIcon.Keyword,
    detail: 'function <name>(<params>) { ... }',
    boost: 75,
  },
  {
    label: 'new',
    type: CompletionIcon.Keyword,
    detail: 'new <Constructor>(...)',
    boost: 80,
  },
  {
    label: 'if',
    type: CompletionIcon.Keyword,
    detail: 'if (<condition>) { ... }',
    boost: 75,
  },
  {
    label: 'else',
    type: CompletionIcon.Keyword,
    detail: 'else { ... }',
    boost: 70,
  },
  {
    label: 'for',
    type: CompletionIcon.Keyword,
    detail: 'for (const item of items) { ... }',
    boost: 75,
  },
  {
    label: 'of',
    type: CompletionIcon.Keyword,
    detail: 'for (const x of iterable)',
    boost: 70,
  },
  {
    label: 'in',
    type: CompletionIcon.Keyword,
    detail: 'for (const key in object)',
    boost: 70,
  },
  {
    label: 'while',
    type: CompletionIcon.Keyword,
    detail: 'while (<condition>) { ... }',
    boost: 70,
  },
  {
    label: 'do',
    type: CompletionIcon.Keyword,
    detail: 'do { ... } while (<condition>);',
    boost: 65,
  },
  {
    label: 'try',
    type: CompletionIcon.Keyword,
    detail: 'try { ... } catch (err) { ... }',
    boost: 75,
  },
  {
    label: 'catch',
    type: CompletionIcon.Keyword,
    detail: 'catch (error) { ... }',
    boost: 70,
  },
  {
    label: 'finally',
    type: CompletionIcon.Keyword,
    detail: 'finally { ... }',
    boost: 65,
  },
  {
    label: 'throw',
    type: CompletionIcon.Keyword,
    detail: 'throw new Error(...)',
    boost: 70,
  },
  {
    label: 'switch',
    type: CompletionIcon.Keyword,
    detail: 'switch (<expression>) { case ... }',
    boost: 65,
  },
  {
    label: 'case',
    type: CompletionIcon.Keyword,
    detail: 'case <value>:',
    boost: 65,
  },
  {
    label: 'default',
    type: CompletionIcon.Keyword,
    detail: 'default:',
    boost: 65,
  },
  {
    label: 'break',
    type: CompletionIcon.Keyword,
    detail: 'break;',
    boost: 65,
  },
  {
    label: 'continue',
    type: CompletionIcon.Keyword,
    detail: 'continue;',
    boost: 65,
  },
  {
    label: 'typeof',
    type: CompletionIcon.Keyword,
    detail: 'typeof <operand>',
    boost: 70,
  },
  {
    label: 'instanceof',
    type: CompletionIcon.Keyword,
    detail: '<object> instanceof <Class>',
    boost: 70,
  },
  {
    label: 'true',
    type: CompletionIcon.Keyword,
    detail: 'boolean literal true',
    boost: 75,
  },
  {
    label: 'false',
    type: CompletionIcon.Keyword,
    detail: 'boolean literal false',
    boost: 75,
  },
  {
    label: 'null',
    type: CompletionIcon.Keyword,
    detail: 'null value',
    boost: 75,
  },
  {
    label: 'undefined',
    type: CompletionIcon.Keyword,
    detail: 'undefined value',
    boost: 70,
  },
  {
    label: 'Date',
    type: CompletionIcon.Type,
    detail: 'new Date() constructor',
    boost: 75,
  },
  {
    label: 'JSON',
    type: CompletionIcon.Type,
    detail: 'JSON.stringify / JSON.parse',
    boost: 75,
  },
  {
    label: 'Math',
    type: CompletionIcon.Type,
    detail: 'Math utilities',
    boost: 70,
  },
  {
    label: 'Promise',
    type: CompletionIcon.Type,
    detail: 'Promise constructor & utilities',
    boost: 75,
  },
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
