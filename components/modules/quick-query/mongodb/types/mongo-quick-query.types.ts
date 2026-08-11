export interface MongoDocument {
  _id: string;
  [key: string]: unknown;
}

export interface MongoCollectionName {
  name: string;
  properties: string[];
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
