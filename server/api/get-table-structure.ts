export interface TableStructure {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  default_value: string | null;
  foreign_keys: string; // example: " -> other_table(column)"
  column_comment: string;
}

export default defineEventHandler(async (event): Promise<TableStructure[]> => {
  const body: {
    dbConnectionString: string;
    schema: string;
    tableName: string;
  } = await readBody(event);

  const resource = await getDatabaseSource({
    dbConnectionString: body.dbConnectionString,
    type: 'postgres',
  });

  const result = await resource.query(
    `
        SELECT
            c.column_name,
            c.data_type,
            (c.is_nullable = 'YES') AS is_nullable,
            -- Aggregate constraints (Primary Key, Unique, etc.) into a single field
            -- COALESCE(
            --     STRING_AGG(DISTINCT tc.constraint_type, ', '),
            --     'None'
            -- ) AS constraint_types,
            -- Default value
            c.column_default AS default_value,
            -- Format foreign keys as column_name -> referenced_table(referenced_column) ON DELETE action ON UPDATE action
            COALESCE(
                STRING_AGG(
                ' -> ' || fkc.referenced_table_name || '(' || fkc.referenced_column_name || ')',
                ', '
                ),
                ''
            ) AS foreign_keys,
            -- Column comment
            COALESCE(
                col_description(
                (
                    SELECT
                    oid
                    FROM
                    pg_class
                    WHERE
                    relname = c.table_name
                ),
                c.ordinal_position
                ),
                ''
            ) AS column_comment
            FROM
            information_schema.columns c
            LEFT JOIN information_schema.constraint_column_usage ccu ON c.table_name = ccu.table_name
            AND c.column_name = ccu.column_name
            LEFT JOIN information_schema.table_constraints tc ON ccu.constraint_name = tc.constraint_name
            LEFT JOIN (
                SELECT
                kcu.table_name,
                kcu.column_name,
                kcu.constraint_name,
                ccu2.table_name AS referenced_table_name,
                ccu2.column_name AS referenced_column_name,
                rc.delete_rule,
                rc.update_rule
                FROM
                information_schema.key_column_usage kcu
                JOIN information_schema.constraint_table_usage ctu ON kcu.constraint_name = ctu.constraint_name
                JOIN information_schema.referential_constraints rc ON kcu.constraint_name = rc.constraint_name
                JOIN information_schema.constraint_column_usage ccu2 ON rc.unique_constraint_name = ccu2.constraint_name
            ) fkc ON c.table_name = fkc.table_name
            AND c.column_name = fkc.column_name
            WHERE
            c.table_name = $1
            AND c.table_schema = $2
            GROUP BY
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            c.table_name,
            c.ordinal_position
            ORDER BY
            c.ordinal_position;
    `,
    [body.tableName, body.schema]
  );

  return result;
});
