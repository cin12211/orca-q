export interface MongoDocument {
  _id: unknown;
  [key: string]: unknown;
}

export interface MongoCollectionName {
  name: string;
  properties: string[];
  size: number;
  count?: number;
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

export enum MongoCollectionViewMode {
  List = 'list',
  Info = 'info',
}

export interface MongoIndexInfo {
  name: string;
  key: Record<string, number | string>;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
}

export interface MongoValidationInfo {
  validator: Record<string, unknown> | null;
  validationLevel: string | null;
  validationAction: string | null;
}

export type MongoFilterOperator =
  | '$eq'
  | '$ne'
  | '$regex'
  | '$gt'
  | '$gte'
  | '$lt'
  | '$lte'
  | '$in'
  | '$nin'
  | '$exists'
  | '$type'
  | '$mod'
  | '$all'
  | '$size';

export interface MongoFilterRow {
  isSelect: boolean;
  field: string;
  operator: MongoFilterOperator;
  value: string;
}

export enum MongoFilterMode {
  Visual = 'visual',
  Raw = 'raw',
}
