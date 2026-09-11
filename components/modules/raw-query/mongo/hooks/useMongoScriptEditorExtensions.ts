import { autocompletion, startCompletion } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { lintGutter, linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { keymap, placeholder } from '@codemirror/view';
import type BaseCodeEditor from '~/components/base/code-editor/BaseCodeEditor.vue';
import type { MongoRawQueryMetadata } from '~/core/types/mongodb-raw-query.types';
import { MONGO_SCRIPT_PLACEHOLDER } from '../constants/mongoScriptCatalog';
import { createMongoScriptCompletionSource } from '../utils/createMongoScriptCompletionSource';

export function useMongoScriptEditorExtensions(options: {
  codeEditorRef: Ref<InstanceType<typeof BaseCodeEditor> | null>;
  fileVariables: Ref<string>;
  databaseName: Ref<string | undefined>;
  collectionContext: Ref<string | undefined>;
  metadata?: Ref<MongoRawQueryMetadata>;
  onExecuteCurrent: () => void | Promise<void>;
}) {
  const extensions: Extension[] = [
    javascript({ typescript: true }),
    placeholder(
      MONGO_SCRIPT_PLACEHOLDER.replace(
        'COLLECTION',
        options.collectionContext.value || 'COLLECTION'
      )
    ),
    autocompletion({
      override: [
        createMongoScriptCompletionSource(
          options.metadata?.value ?? { collections: [], fieldsByCollection: {} }
        ),
      ],
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
      { key: 'Mod-i', run: startCompletion },
    ]),
  ];
  return { extensions, reloadMongoCompartment: () => undefined };
}
