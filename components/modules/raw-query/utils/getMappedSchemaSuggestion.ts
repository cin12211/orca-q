import type { Completion } from '@codemirror/autocomplete';
import type { SQLNamespace } from '@codemirror/lang-sql';
import { CompletionIcon } from '~/components/base/code-editor/extensions';
import type { TableDetails } from '~/server/api/get-schema-meta-data';

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

      if (primaryKeys?.find(pk => pk.column === col.name)) {
        type = CompletionIcon.Keyword;
      } else if (foreignKeys?.find(fk => fk.column === col.name)) {
        type = CompletionIcon.ForeignKey;
      } else {
        type = CompletionIcon.Field;
      }

      const sqlNamespace: Completion = {
        label: col.name,
        type,
        boost: -col.ordinal_position,
        detail: col.short_type_name, // show in last suggestion
        // info: col.short_type_name || '', // show tooltip
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
