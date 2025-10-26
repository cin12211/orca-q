import type { Completion } from '@codemirror/autocomplete';
import type { SQLNamespace } from '@codemirror/lang-sql';
import { CompletionIcon } from '~/components/base/code-editor/constants';
import type { TableDetails } from '~/server/api/get-schema-meta-data';

export function generateTableAlias(tableName: string): string {
  // convert to lowercase
  let name = tableName.toLowerCase();

  // remove prefix like 'tbl_', 'table_'
  const prefixes = ['tbl_', 'table_'];
  for (const prefix of prefixes) {
    if (name?.startsWith(prefix)) {
      name = name.slice(prefix.length);
    }
  }

  // remote extra suffix like '_v1', '_2023'
  name = name.replace(/(_v\d+|_\d+)$/, '');

  // split by _ or -
  let words = name.split(/[_-]/);

  // parser camelCase/PascalCase
  if (words.length === 1) {
    words = name.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\b)/g) || [name];
  }

  // get the first letter of each word
  let alias = words
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('');

  if (!alias && name) {
    alias = name[0];
  }

  return alias;
}

export const getMappedSchemaSuggestion = ({
  tableDetails,
}: {
  tableDetails: TableDetails | null | undefined;
}) => {
  const schema: SQLNamespace = {};

  for (const key in tableDetails) {
    const columns = tableDetails[key]?.columns;

    const foreignKeys = tableDetails[key]?.foreign_keys;
    const primaryKeys = tableDetails[key]?.primary_keys;

    const mappedColumns = columns.map(col => {
      let type = '';

      const isPrimaryKey = primaryKeys?.find(pk => pk.column === col.name);
      const isForeignKey = foreignKeys?.find(fk => fk.column === col.name);

      if (isPrimaryKey) {
        type = CompletionIcon.Keyword;
      } else if (isForeignKey) {
        type = CompletionIcon.ForeignKey;
      } else {
        type = CompletionIcon.Field;
      }

      const sqlNamespace: Completion = {
        label: col.name,
        type,
        boost: -col.ordinal_position,
        detail: col.short_type_name, // show in last suggestion,

        info: () => {
          const container = document.createElement('div');
          container.className = 'gap-1 flex flex-col text-sm min-w-[10rem]';

          container.innerHTML = `
            <div class="font-medium text-md mt-1">${col.name}</div>
            <p class="text-xs">Type: ${col.short_type_name}</p>
            <p class="text-xs">Ordinal: ${col.ordinal_position}</p>
            <p class="text-xs">Primary Key:  ${isPrimaryKey ? 'yes' : '-'}</p> 
            <p class="text-xs">Foreign Key:  ${isForeignKey ? 'yes' : '-'}</p> 
          `;

          return container;
        },
      };

      return sqlNamespace;
    });

    mappedColumns.push({
      label: '*',
      type: CompletionIcon.Function,
      boost: 50,
      detail: `All ${key}'s columns`,
    });

    schema[key] = mappedColumns;
  }

  return schema;
};
