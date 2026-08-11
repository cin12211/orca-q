export interface MongoDocument {
  _id: string;
  [key: string]: unknown;
}

export interface MongoCollectionSummary {
  name: string;
  documentCount: number;
}

export type MongoCollectionViewMode = 'table' | 'list' | 'object-list';
