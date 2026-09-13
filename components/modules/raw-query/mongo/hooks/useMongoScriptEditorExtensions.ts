import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { lintGutter, linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { keymap, placeholder } from '@codemirror/view';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import { sqlAutoCompletion } from '~/components/base/code-editor/extensions';
import type { MongoRawQueryMetadata } from '~/core/types/mongodb-raw-query.types';
import { getMongoScriptPlaceholder } from '../constants/mongoScriptCatalog';
import { createMongoScriptCompletionSource } from '../utils/createMongoScriptCompletionSource';

export function useMongoScriptEditorExtensions(options: {
  codeEditorRef: Ref<InstanceType<typeof BaseCodeEditor> | null>;
  fileVariables: Ref<string>;
  databaseName: Ref<string | undefined>;
  collectionContext: Ref<string | undefined>;
  metadata?: Ref<MongoRawQueryMetadata>;
  databases?: Ref<string[]>;
  metadataByDatabase?: Ref<Record<string, MongoRawQueryMetadata>>;
  ensureDatabaseMetadata?: (databaseName: string) => void | Promise<unknown>;
  onExecuteCurrent: () => void | Promise<void>;
  onFormat: () => void | Promise<void>;
}) {
  const completionSource = createMongoScriptCompletionSource({
    getMetadata: databaseName =>
      options.metadataByDatabase?.value[databaseName ?? ''] ??
      options.metadata?.value ?? {
        collections: [],
        fieldsByCollection: {},
      },
    databases: () => options.databases?.value ?? [],
    fileVariables: () => options.fileVariables.value,
    ensureDatabaseMetadata: options.ensureDatabaseMetadata,
  });

  const extensions: Extension[] = [
    javascript({ typescript: true }),
    placeholder(
      getMongoScriptPlaceholder(
        options.databaseName.value,
        options.collectionContext.value
      )
    ),
    ...sqlAutoCompletion({
      override: [completionSource],
    }),
    lintGutter(),
    linter(view =>
      view.state.doc.toString().includes('return')
        ? []
        : [
            {
              from: 0,
              to: 0,
              severity: 'info',
              message: 'Add a top-level return to publish a value.',
            },
          ]
    ),
    keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          void options.onExecuteCurrent();
          return true;
        },
      },
      {
        key: 'Mod-s',
        run: () => {
          void options.onFormat();
          return true;
        },
      },
      { key: 'Mod-i', run: startCompletion },
      { key: 'Tab', run: acceptCompletion },
    ]),
  ];
  return { extensions, reloadMongoCompartment: () => undefined };
}
