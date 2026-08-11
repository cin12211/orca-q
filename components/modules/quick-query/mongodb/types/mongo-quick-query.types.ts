export interface MongoDocument {
  _id: string;
  [key: string]: unknown;
}

export interface MongoCollectionName {
  name: string;
  properties: string[];
  size: number;
}

export interface MongoDatabaseStats {
  collections: number;
  views: number;
  objects: number;
  avgObjectSize: number;
  dataSize: number;
  storageSize: number;
  indexes: number;
  indexSize: number;
  totalSize: number;
}

export interface MongoCollectionSummary {
  name: string;
  properties: string[];
  documentCount: number;
  storageSize: number;
  dataSize: number;
  avgDocumentSize: number;
  indexCount: number;
  totalIndexSize: number;
}

export type MongoCollectionViewMode = 'table' | 'list' | 'object-list';
