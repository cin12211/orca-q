export interface MongoScriptCatalogEntry {
  label: string;
  type: string;
  detail: string;
  info?: string;
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

export const MONGO_SCRIPT_PLACEHOLDER =
  "return db.collection('COLLECTION').find({}).limit(100)";
