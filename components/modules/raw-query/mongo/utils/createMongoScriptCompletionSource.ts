import {
  CompletionContext,
  type Completion,
  type CompletionResult,
} from '@codemirror/autocomplete';
import {
  completionPath,
  localCompletionSource,
} from '@codemirror/lang-javascript';
import { CompletionIcon } from '~/components/base/code-editor/constants';
import type { MongoRawQueryMetadata } from '~/core/types/mongodb-raw-query.types';
import {
  MONGO_SCRIPT_BSON_HELPERS,
  MONGO_SCRIPT_COLLECTION_METHODS,
  MONGO_SCRIPT_CONSOLE_METHODS,
  MONGO_SCRIPT_CURSOR_METHODS,
  MONGO_SCRIPT_DATABASE_METHODS,
  MONGO_SCRIPT_EJSON_METHODS,
  MONGO_SCRIPT_JSON_METHODS,
  MONGO_SCRIPT_JS_KEYWORDS,
  MONGO_SCRIPT_MATH_METHODS,
  MONGO_SCRIPT_SNIPPETS,
  MONGO_SCRIPT_TOP_LEVEL_HELPERS,
} from '../constants/mongoScriptCatalog';
import {
  createMongoCatalogSuggestionInfo,
  createMongoCollectionSuggestionInfo,
  createMongoDatabaseSuggestionInfo,
  createMongoVariableSuggestionInfo,
} from './createMongoSuggestionInfo';

type MongoScriptCompletionOptions = {
  getMetadata: (databaseName?: string) => MongoRawQueryMetadata;
  databases: () => string[];
  fileVariables?: () => string | undefined;
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
    const prefix = word.length > 0 ? before.slice(0, -word.length) : before;

    // 1. Variable completion with ':' prefix (e.g. :user_id)
    const colonMatch = before.match(/:(\w*)$/);
    if (colonMatch && completion.fileVariables) {
      try {
        const rawVars = completion.fileVariables();
        if (rawVars) {
          const varsJson = JSON.parse(rawVars);
          const varPrefix = colonMatch[1];
          const varOptions: Completion[] = [];
          for (const key in varsJson) {
            if (!varPrefix || key.startsWith(varPrefix)) {
              varOptions.push({
                label: `:${key}`,
                type: CompletionIcon.Variable,
                boost: 120,
                detail: 'variable',
                info: () =>
                  createMongoVariableSuggestionInfo(key, varsJson[key]),
                apply(view, comp, from, to) {
                  const beforeChar = view.state.doc.sliceString(from - 1, from);
                  const adjustedFrom = beforeChar === ':' ? from - 1 : from;
                  view.dispatch({
                    changes: { from: adjustedFrom, to, insert: comp.label },
                  });
                },
              });
            }
          }
          if (varOptions.length > 0) {
            return {
              from: context.pos - colonMatch[0].length,
              options: varOptions,
              validFor: /^:\w*$/,
            };
          }
        }
      } catch {
        // Ignore parse error
      }
    }

    // 2. Variable completion with params.<key>
    if (/\bparams\.$/.test(prefix) && completion.fileVariables) {
      try {
        const rawVars = completion.fileVariables();
        if (rawVars) {
          const varsJson = JSON.parse(rawVars);
          const varOptions: Completion[] = [];
          for (const key in varsJson) {
            if (!word || key.startsWith(word)) {
              varOptions.push({
                label: key,
                type: CompletionIcon.Variable,
                boost: 120,
                detail: 'variable',
                info: () =>
                  createMongoVariableSuggestionInfo(key, varsJson[key]),
              });
            }
          }
          if (varOptions.length > 0) {
            return {
              from: context.pos - word.length,
              options: varOptions,
              validFor: /^\w*$/,
            };
          }
        }
      } catch {
        // Ignore parse error
      }
    }

    let completionOptions: Completion[] = [];

    // Extract database aliases: const sissDB = db.getSiblingDB('...')
    const databaseAliases = new Map<string, string>();
    for (const match of before.matchAll(
      /\b(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:db|[A-Za-z_$][\w$]*)\.getSiblingDB\(\s*['"]([^'"]+)['"]\s*\)/g
    )) {
      databaseAliases.set(match[1], match[2]);
    }

    // Extract collection aliases: const users = db.collection('users') or db.users
    const collectionAliases = new Set<string>();
    for (const match of before.matchAll(
      /\b(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:db|[A-Za-z_$][\w$]*)\.collection\(\s*['"]([^'"]+)['"]\s*\)/g
    )) {
      collectionAliases.add(match[1]);
    }
    const dbMethods = [
      'getSiblingDB',
      'command',
      'listCollections',
      'collection',
      'createCollection',
      'dropDatabase',
    ];
    for (const match of before.matchAll(
      /\b(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:db|[A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/g
    )) {
      const varName = match[1];
      const prop = match[2];
      if (!dbMethods.includes(prop)) {
        collectionAliases.add(varName);
      }
    }

    // 3. AST-aware member expression completion via @codemirror/lang-javascript
    const jsPath = completionPath(context);
    if (jsPath && jsPath.path.length > 0) {
      const root = jsPath.path[0];
      if (root === 'console') {
        completionOptions = MONGO_SCRIPT_CONSOLE_METHODS.map(entry => ({
          ...entry,
          boost: entry.boost ?? 90,
          info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
        }));
      } else if (root === 'BSON') {
        completionOptions = MONGO_SCRIPT_BSON_HELPERS.map(entry => ({
          ...entry,
          boost: 90,
          info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
        }));
      } else if (root === 'EJSON') {
        completionOptions = MONGO_SCRIPT_EJSON_METHODS.map(entry => ({
          ...entry,
          boost: 90,
          info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
        }));
      } else if (root === 'JSON') {
        completionOptions = MONGO_SCRIPT_JSON_METHODS.map(entry => ({
          ...entry,
          boost: 90,
          info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
        }));
      } else if (root === 'Math') {
        completionOptions = MONGO_SCRIPT_MATH_METHODS.map(entry => ({
          ...entry,
          boost: 90,
          info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
        }));
      } else if (jsPath.path.length === 1) {
        if (root === 'db' || databaseAliases.has(root)) {
          const dbName = root !== 'db' ? databaseAliases.get(root) : undefined;
          if (dbName) {
            void completion.ensureDatabaseMetadata?.(dbName);
          }
          const metadata = completion.getMetadata(dbName);
          const collectionOptions: Completion[] = metadata.collections.map(
            label => {
              const fields = metadata.fieldsByCollection[label] ?? [];
              return {
                label,
                type: CompletionIcon.Table,
                detail:
                  fields.length > 0 ? `${fields.length} fields` : 'collection',
                boost: 100,
                info: () =>
                  createMongoCollectionSuggestionInfo(label, dbName, fields),
              };
            }
          );
          const methodOptions: Completion[] = MONGO_SCRIPT_DATABASE_METHODS.map(
            entry => ({
              ...entry,
              boost: 90,
              info:
                entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
            })
          );
          completionOptions = [...collectionOptions, ...methodOptions];
        } else if (
          collectionAliases.has(root) ||
          completion.getMetadata().collections.includes(root)
        ) {
          completionOptions = MONGO_SCRIPT_COLLECTION_METHODS.map(entry => ({
            ...entry,
            boost: 90,
            info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
          }));
        }
      } else if (jsPath.path.length === 2) {
        const [dbObj, colProp] = jsPath.path;
        if (dbObj === 'db' || databaseAliases.has(dbObj)) {
          if (!dbMethods.includes(colProp)) {
            completionOptions = MONGO_SCRIPT_COLLECTION_METHODS.map(entry => ({
              ...entry,
              boost: 90,
              info:
                entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
            }));
          }
        }
      }

      return {
        from: context.pos - jsPath.name.length,
        options: completionOptions.filter(item =>
          item.label.startsWith(jsPath.name)
        ),
        validFor: /^[\w$]*$/,
      };
    }

    // 4. Database completion inside getSiblingDB('...')
    const databaseMatch = before.match(
      /\b(?:db|[A-Za-z_$][\w$]*)\.getSiblingDB\(\s*['"][^'"]*$/
    );
    if (databaseMatch) {
      completionOptions = completion.databases().map(label => ({
        label,
        type: CompletionIcon.Database,
        detail: 'database',
        boost: 100,
        info: () => createMongoDatabaseSuggestionInfo(label),
      }));
    }
    // 5. Collection name completion inside collection('...')
    else if (/\b([A-Za-z_$][\w$]*)\.collection\(\s*['"][^'"]*$/.test(before)) {
      const collectionOwner = before.match(
        /\b([A-Za-z_$][\w$]*)\.collection\(\s*['"][^'"]*$/
      )?.[1];
      const collectionDatabase =
        collectionOwner && collectionOwner !== 'db'
          ? databaseAliases.get(collectionOwner)
          : undefined;

      const metadata = completion.getMetadata(collectionDatabase);
      if (collectionDatabase) {
        void completion.ensureDatabaseMetadata?.(collectionDatabase);
      }
      completionOptions = metadata.collections.map(label => {
        const fields = metadata.fieldsByCollection[label] ?? [];
        return {
          label,
          type: CompletionIcon.Table,
          detail: fields.length > 0 ? `${fields.length} fields` : 'collection',
          boost: 100,
          info: () =>
            createMongoCollectionSuggestionInfo(
              label,
              collectionDatabase,
              fields
            ),
        };
      });
    }
    // 6. Console methods completion fallback
    else if (/\bconsole\s*\.\s*$/.test(prefix)) {
      completionOptions = MONGO_SCRIPT_CONSOLE_METHODS.map(entry => ({
        ...entry,
        boost: entry.boost ?? 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 7. BSON constructors / types completion fallback
    else if (/\bBSON\s*\.\s*$/.test(prefix)) {
      completionOptions = MONGO_SCRIPT_BSON_HELPERS.map(entry => ({
        ...entry,
        boost: 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 8. EJSON methods completion fallback
    else if (/\bEJSON\s*\.\s*$/.test(prefix)) {
      completionOptions = MONGO_SCRIPT_EJSON_METHODS.map(entry => ({
        ...entry,
        boost: 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 9. JSON methods completion fallback
    else if (/\bJSON\s*\.\s*$/.test(prefix)) {
      completionOptions = MONGO_SCRIPT_JSON_METHODS.map(entry => ({
        ...entry,
        boost: 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 10. Math methods completion fallback
    else if (/\bMath\s*\.\s*$/.test(prefix)) {
      completionOptions = MONGO_SCRIPT_MATH_METHODS.map(entry => ({
        ...entry,
        boost: 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 11. Cursor method chaining (find()., aggregate()., sort()., etc.)
    else if (
      /\b(?:find|aggregate|sort|project|skip|limit|batchSize|hint|collation|comment)\([^)]*\)\s*\.\s*$/.test(
        prefix
      )
    ) {
      completionOptions = MONGO_SCRIPT_CURSOR_METHODS.map(entry => ({
        ...entry,
        boost: entry.boost ?? 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 12. Collection method chaining via .collection('...').
    else if (
      /\b(?:db|[A-Za-z_$][\w$]*)\.collection\(\s*['"][^'"]+['"]\s*\)\s*\.\s*$/.test(
        prefix
      )
    ) {
      completionOptions = MONGO_SCRIPT_COLLECTION_METHODS.map(entry => ({
        ...entry,
        boost: 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 13. Database dot access: db. or <dbAlias>. or getSiblingDB('...').
    else if (
      (() => {
        // Direct chain from getSiblingDB('...').
        const siblingMatch = prefix.match(
          /\b(?:db|[A-Za-z_$][\w$]*)\.getSiblingDB\(\s*['"]([^'"]+)['"]\s*\)\s*\.\s*$/
        );
        if (siblingMatch) {
          const dbName = siblingMatch[1];
          void completion.ensureDatabaseMetadata?.(dbName);
          const metadata = completion.getMetadata(dbName);
          const collectionOptions: Completion[] = metadata.collections.map(
            label => {
              const fields = metadata.fieldsByCollection[label] ?? [];
              return {
                label,
                type: CompletionIcon.Table,
                detail:
                  fields.length > 0 ? `${fields.length} fields` : 'collection',
                boost: 100,
                info: () =>
                  createMongoCollectionSuggestionInfo(label, dbName, fields),
              };
            }
          );
          const methodOptions: Completion[] = MONGO_SCRIPT_DATABASE_METHODS.map(
            entry => ({
              ...entry,
              boost: 90,
              info:
                entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
            })
          );
          completionOptions = [...collectionOptions, ...methodOptions];
          return true;
        }

        // Single target dot access: db. or sissDB. (even in const sissDB.)
        const singleTargetMatch = prefix.match(/\b([A-Za-z_$][\w$]*)\s*\.\s*$/);
        if (!singleTargetMatch) return false;
        const target = singleTargetMatch[1];
        const isDb = target === 'db' || databaseAliases.has(target);
        if (!isDb) return false;

        const dbName =
          target !== 'db' ? databaseAliases.get(target) : undefined;

        if (dbName) {
          void completion.ensureDatabaseMetadata?.(dbName);
        }
        const metadata = completion.getMetadata(dbName);
        const collectionOptions: Completion[] = metadata.collections.map(
          label => {
            const fields = metadata.fieldsByCollection[label] ?? [];
            return {
              label,
              type: CompletionIcon.Table,
              detail:
                fields.length > 0 ? `${fields.length} fields` : 'collection',
              boost: 100,
              info: () =>
                createMongoCollectionSuggestionInfo(label, dbName, fields),
            };
          }
        );
        const methodOptions: Completion[] = MONGO_SCRIPT_DATABASE_METHODS.map(
          entry => ({
            ...entry,
            boost: 90,
            info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
          })
        );
        completionOptions = [...collectionOptions, ...methodOptions];
        return true;
      })()
    ) {
      // Handled inside IIFE
    }
    // 14. Direct collection property access on a database: db.users. or sissDB.orders.
    else if (
      (() => {
        const propMatch = prefix.match(
          /\b([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\.\s*$/
        );
        if (!propMatch) return false;
        const [_, dbObj, colProp] = propMatch;
        const isDb = dbObj === 'db' || databaseAliases.has(dbObj);
        return isDb && !dbMethods.includes(colProp);
      })()
    ) {
      completionOptions = MONGO_SCRIPT_COLLECTION_METHODS.map(entry => ({
        ...entry,
        boost: 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 15. Target is a collection variable (users. or assigned collection alias)
    else if (
      (() => {
        const singleTargetMatch = prefix.match(/\b([A-Za-z_$][\w$]*)\s*\.\s*$/);
        if (!singleTargetMatch) return false;
        const target = singleTargetMatch[1];
        if (collectionAliases.has(target)) return true;
        const currentCollections = completion.getMetadata().collections;
        return currentCollections.includes(target);
      })()
    ) {
      completionOptions = MONGO_SCRIPT_COLLECTION_METHODS.map(entry => ({
        ...entry,
        boost: 90,
        info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
      }));
    }
    // 16. Any other dot access (unknown object) -> do NOT suggest collection methods!
    else if (/\.\s*$/.test(prefix)) {
      completionOptions = [];
    }
    // 17. Top-level / general statement completions
    else {
      const topLevelOptions: Completion[] = MONGO_SCRIPT_TOP_LEVEL_HELPERS.map(
        entry => ({
          ...entry,
          boost: 90,
          info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
        })
      );

      const bsonOptions: Completion[] = MONGO_SCRIPT_BSON_HELPERS.map(
        entry => ({
          ...entry,
          boost: 80,
          info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
        })
      );

      const jsKeywordOptions: Completion[] = MONGO_SCRIPT_JS_KEYWORDS.map(
        entry => ({
          ...entry,
          boost: entry.boost ?? 70,
          info: entry.info ?? (() => createMongoCatalogSuggestionInfo(entry)),
        })
      );

      const aliasOptions: Completion[] = [];
      for (const [alias, dbName] of databaseAliases.entries()) {
        aliasOptions.push({
          label: alias,
          type: CompletionIcon.Database,
          detail: `Database (${dbName})`,
          boost: 95,
          info: () => createMongoDatabaseSuggestionInfo(dbName),
        });
      }
      for (const alias of collectionAliases) {
        aliasOptions.push({
          label: alias,
          type: CompletionIcon.Table,
          detail: 'Collection variable',
          boost: 95,
        });
      }

      // Add local variables from AST via localCompletionSource
      let localOptions: Completion[] = [];
      try {
        const localRes = localCompletionSource(context);
        if (localRes?.options) {
          const knownLabels = new Set([
            ...topLevelOptions.map(o => o.label),
            ...MONGO_SCRIPT_SNIPPETS.map(o => o.label),
            ...bsonOptions.map(o => o.label),
            ...jsKeywordOptions.map(o => o.label),
            ...aliasOptions.map(o => o.label),
          ]);
          localOptions = localRes.options
            .filter(o => !knownLabels.has(o.label))
            .map(o => ({
              label: o.label,
              type: CompletionIcon.Variable,
              detail: 'local variable',
              boost: 70,
            }));
        }
      } catch {
        // Ignore if AST not ready
      }

      completionOptions = [
        ...topLevelOptions,
        ...MONGO_SCRIPT_SNIPPETS,
        ...bsonOptions,
        ...jsKeywordOptions,
        ...aliasOptions,
        ...localOptions,
      ];
    }

    return {
      from: context.pos - word.length,
      options: completionOptions.filter(item => item.label.startsWith(word)),
      validFor: /^[\w$]*$/,
    };
  };
}

export async function completionDetails(
  source: string,
  _metadata?: MongoRawQueryMetadata
) {
  const match = source.match(/\.([\w$]*)$/);
  const method = match?.[1] ?? '';
  const item = [
    ...MONGO_SCRIPT_COLLECTION_METHODS,
    ...MONGO_SCRIPT_DATABASE_METHODS,
  ].find(entry => entry.label.startsWith(method));
  return item?.requiresConfirmation
    ? `${item.detail} - Requires confirmation`
    : (item?.detail ?? '');
}
