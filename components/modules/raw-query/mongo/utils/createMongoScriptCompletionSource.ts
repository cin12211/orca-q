import {
  CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import type { MongoRawQueryMetadata } from '~/core/types/mongodb-raw-query.types';
import {
  MONGO_SCRIPT_BSON_HELPERS,
  MONGO_SCRIPT_COLLECTION_METHODS,
  MONGO_SCRIPT_DATABASE_METHODS,
} from '../constants/mongoScriptCatalog';
import {
  createMongoCatalogSuggestionInfo,
  createMongoCollectionSuggestionInfo,
  createMongoDatabaseSuggestionInfo,
} from './createMongoSuggestionInfo';

type MongoScriptCompletionOptions = {
  getMetadata: (databaseName?: string) => MongoRawQueryMetadata;
  databases: () => string[];
  ensureDatabaseMetadata?: (databaseName: string) => void | Promise<unknown>;
};

export function createMongoScriptCompletionSource(
  options: MongoScriptCompletionOptions | MongoRawQueryMetadata
) {
  const completion =
    'collections' in options
      ? {
          getMetadata: () => options,
          databases: () => [],
        }
      : options;
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.state.sliceDoc(0, context.pos);
    const word = before.match(/[\w$]*$/)?.[0] ?? '';
    const prefix = before.slice(0, -word.length);
    let completionOptions = MONGO_SCRIPT_BSON_HELPERS;
    const databaseMatch = before.match(/db\.getSiblingDB\(['"][^'"]*$/);
    const databaseAliases = new Map(
      [
        ...before.matchAll(
          /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*db\.getSiblingDB\(['"]([^'"]+)['"]\)/g
        ),
      ].map(match => [match[1], match[2]])
    );
    const collectionOwner = before.match(
      /\b([A-Za-z_$][\w$]*)\.collection\(['"][^'"]*$/
    )?.[1];
    const collectionDatabase =
      collectionOwner && collectionOwner !== 'db'
        ? databaseAliases.get(collectionOwner)
        : undefined;
    if (databaseMatch) {
      completionOptions = completion.databases().map(label => ({
        label,
        type: 'class',
        detail: 'MongoDB database',
        info: () => createMongoDatabaseSuggestionInfo(label),
      }));
    } else if (collectionOwner) {
      const metadata = completion.getMetadata(collectionDatabase);
      if (collectionDatabase)
        void completion.ensureDatabaseMetadata?.(collectionDatabase);
      completionOptions = metadata.collections.map(label => ({
        label,
        type: 'class',
        detail: 'MongoDB collection',
        info: () =>
          createMongoCollectionSuggestionInfo(
            label,
            collectionDatabase,
            metadata.fieldsByCollection[label] ?? []
          ),
      }));
    } else if (/\bdb\.$/.test(before)) {
      completionOptions = MONGO_SCRIPT_DATABASE_METHODS;
    } else if (/\b(?:db\.collection\(['"][^'"]+['"]\)|\w+)\.$/.test(before)) {
      completionOptions = MONGO_SCRIPT_COLLECTION_METHODS;
    }
    completionOptions = completionOptions.map(entry => ({
      ...entry,
      info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
    }));
    return {
      from: context.pos - word.length,
      options: completionOptions.filter(item => item.label.startsWith(word)),
      validFor: /^\w*$/,
    };
  };
}

export async function completionDetails(
  source: string,
  metadata: MongoRawQueryMetadata
) {
  const match = source.match(/\.([\w$]*)$/);
  const method = match?.[1] ?? '';
  const item = MONGO_SCRIPT_COLLECTION_METHODS.find(entry =>
    entry.label.startsWith(method)
  );
  return item?.requiresConfirmation
    ? `${item.detail} - Requires confirmation`
    : (item?.detail ?? '');
}
