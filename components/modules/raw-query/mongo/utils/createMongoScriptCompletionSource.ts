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

export function createMongoScriptCompletionSource(
  metadata: MongoRawQueryMetadata
) {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.state.sliceDoc(0, context.pos);
    const word = before.match(/[\w$]*$/)?.[0] ?? '';
    const prefix = before.slice(0, -word.length);
    let options = MONGO_SCRIPT_BSON_HELPERS;
    if (/db\.collection\(['"][^'"]*$/.test(before)) {
      options = metadata.collections.map(label => ({
        label,
        type: 'class',
        detail: 'MongoDB collection',
      }));
    } else if (/\bdb\.$/.test(before)) {
      options = MONGO_SCRIPT_DATABASE_METHODS;
    } else if (/\b(?:db\.collection\(['"][^'"]+['"]\)|\w+)\.$/.test(before)) {
      options = MONGO_SCRIPT_COLLECTION_METHODS;
    }
    return {
      from: context.pos - word.length,
      options: options.filter(item => item.label.startsWith(word)),
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
