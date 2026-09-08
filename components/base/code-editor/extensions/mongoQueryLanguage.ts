import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import { acceptCompletion, startCompletion } from '@codemirror/autocomplete';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { linter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { sqlAutoCompletion } from './customAutoCompleteUi';

interface MongoOperatorDoc {
  label: string;
  type: string;
  detail: string;
  info: string;
}

/**
 * MongoDB operator definitions for autocompletion (clean labels without literal quotes)
 */
const mongoOperators: MongoOperatorDoc[] = [
  // Comparison
  {
    label: '$eq',
    type: 'keyword',
    detail: 'Comparison',
    info: 'Matches values that are equal to a specified value.',
  },
  {
    label: '$gt',
    type: 'keyword',
    detail: 'Comparison',
    info: 'Matches values that are greater than a specified value.',
  },
  {
    label: '$gte',
    type: 'keyword',
    detail: 'Comparison',
    info: 'Matches values that are greater than or equal to a specified value.',
  },
  {
    label: '$in',
    type: 'keyword',
    detail: 'Array',
    info: 'Matches any of the values specified in an array.',
  },
  {
    label: '$lt',
    type: 'keyword',
    detail: 'Comparison',
    info: 'Matches values that are less than a specified value.',
  },
  {
    label: '$lte',
    type: 'keyword',
    detail: 'Comparison',
    info: 'Matches values that are less than or equal to a specified value.',
  },
  {
    label: '$ne',
    type: 'keyword',
    detail: 'Comparison',
    info: 'Matches all values that are not equal to a specified value.',
  },
  {
    label: '$nin',
    type: 'keyword',
    detail: 'Array',
    info: 'Matches none of the values specified in an array.',
  },

  // Logical
  {
    label: '$and',
    type: 'keyword',
    detail: 'Logical',
    info: 'Joins query clauses with a logical AND.',
  },
  {
    label: '$not',
    type: 'keyword',
    detail: 'Logical',
    info: 'Inverts the effect of a query expression.',
  },
  {
    label: '$nor',
    type: 'keyword',
    detail: 'Logical',
    info: 'Joins query clauses with a logical NOR.',
  },
  {
    label: '$or',
    type: 'keyword',
    detail: 'Logical',
    info: 'Joins query clauses with a logical OR.',
  },

  // Element
  {
    label: '$exists',
    type: 'keyword',
    detail: 'Element',
    info: 'Matches documents that have the specified field.',
  },
  {
    label: '$type',
    type: 'keyword',
    detail: 'Element',
    info: 'Selects documents if a field is of the specified type.',
  },

  // Evaluation
  {
    label: '$mod',
    type: 'keyword',
    detail: 'Evaluation',
    info: 'Performs a modulo operation on the value of a field.',
  },
  {
    label: '$regex',
    type: 'keyword',
    detail: 'Evaluation',
    info: 'Selects documents where values match a specified regular expression.',
  },
  {
    label: '$text',
    type: 'keyword',
    detail: 'Evaluation',
    info: 'Performs text search.',
  },
  {
    label: '$where',
    type: 'keyword',
    detail: 'Evaluation',
    info: 'Matches documents that satisfy a JavaScript expression.',
  },

  // Array
  {
    label: '$all',
    type: 'keyword',
    detail: 'Array',
    info: 'Matches arrays that contain all elements specified in the query.',
  },
  {
    label: '$elemMatch',
    type: 'keyword',
    detail: 'Array',
    info: 'Selects documents if element in the array field matches all the specified $elemMatch conditions.',
  },
  {
    label: '$size',
    type: 'keyword',
    detail: 'Array',
    info: 'Selects documents if the array field is a specified size.',
  },

  // Geospatial
  {
    label: '$geoIntersects',
    type: 'keyword',
    detail: 'Geospatial',
    info: 'Selects geometries that intersect with a GeoJSON geometry.',
  },
  {
    label: '$geoWithin',
    type: 'keyword',
    detail: 'Geospatial',
    info: 'Selects geometries within a bounding GeoJSON geometry.',
  },
  {
    label: '$near',
    type: 'keyword',
    detail: 'Geospatial',
    info: 'Returns geospatial objects in proximity to a point.',
  },
  {
    label: '$nearSphere',
    type: 'keyword',
    detail: 'Geospatial',
    info: 'Returns geospatial objects in proximity to a point on a sphere.',
  },

  // Bitwise
  {
    label: '$bitsAllClear',
    type: 'keyword',
    detail: 'Bitwise',
    info: 'Matches numeric or binary values in which a set of bit positions all have a value of 0.',
  },
  {
    label: '$bitsAllSet',
    type: 'keyword',
    detail: 'Bitwise',
    info: 'Matches numeric or binary values in which a set of bit positions all have a value of 1.',
  },
  {
    label: '$bitsAnyClear',
    type: 'keyword',
    detail: 'Bitwise',
    info: 'Matches numeric or binary values in which any bit from a set of bit positions has a value of 0.',
  },
  {
    label: '$bitsAnySet',
    type: 'keyword',
    detail: 'Bitwise',
    info: 'Matches numeric or binary values in which any bit from a set of bit positions has a value of 1.',
  },
];

/**
 * Autocompletion logic for MongoDB operators and collection schema fields in JSON context
 */
function createMongoAutocomplete(getFields?: () => string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    // Match optional leading quote, optional $, and word/dot characters
    const word = context.matchBefore(/"?\$?[\w.]*/);

    if (!word) {
      if (!context.explicit) return null;
    }

    const pos = context.pos;
    const wordText = word ? word.text : '';
    const hasQuoteAtStart = wordText.startsWith('"');

    // If word starts with a quote, replacement `from` is position after quote
    const from = word ? (hasQuoteAtStart ? word.from + 1 : word.from) : pos;
    const to = pos;

    // Check if inside quotes
    const charBeforeFrom =
      from > 0 ? context.state.sliceDoc(from - 1, from) : '';
    const isInsideQuote = charBeforeFrom === '"';

    const fields = getFields ? getFields() : [];

    const fieldCompletions: Completion[] = fields.map(field => ({
      label: field,
      type: 'field',
      detail: 'Field',
      apply: isInsideQuote ? field : `"${field}"`,
    }));

    const operatorCompletions: Completion[] = mongoOperators.map(op => ({
      label: op.label,
      type: 'keyword',
      detail: op.detail,
      info: op.info,
      apply: isInsideQuote ? op.label : `"${op.label}"`,
    }));

    const allOptions = [...fieldCompletions, ...operatorCompletions];

    if (word && word.from === word.to && !context.explicit) {
      return null;
    }

    return {
      from,
      to,
      options: allOptions,
      validFor: /^"?\$?[\w.]*$/,
    };
  };
}

/**
 * Compact inline theme for MongoDB queries
 */
export const mongoQueryEditorTheme = EditorView.theme({
  '&': {
    fontSize: '12px',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-content': {
    padding: '6px 4px',
  },
  '.cm-line': {
    padding: '0 4px',
  },
  '.cm-activeLine': {
    backgroundColor: 'transparent',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
  },
});

/**
 * Keymap extension to bind Mod-Enter (Cmd+Enter/Ctrl+Enter) to execute the query
 */
export function mongoExecuteKeymap(onExecute: () => void): Extension {
  return keymap.of([
    {
      key: 'Mod-Enter',
      run: () => {
        onExecute();
        return true;
      },
    },
  ]);
}

/**
 * Main extension bundle for MongoDB Query language matching RawQuery structure
 */
export function mongoQuery(fields?: string[] | (() => string[])): Extension[] {
  const getFields = typeof fields === 'function' ? fields : () => fields || [];
  const jsonLang = json();

  return [
    jsonLang,
    jsonLang.language.data.of({
      autocomplete: createMongoAutocomplete(getFields),
    }),
    keymap.of([
      { key: 'Mod-i', run: startCompletion },
      { key: 'Tab', run: acceptCompletion },
    ]),
    ...sqlAutoCompletion(),
    linter(jsonParseLinter()),
    mongoQueryEditorTheme,
  ];
}
