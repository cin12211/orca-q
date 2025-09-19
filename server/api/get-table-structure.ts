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
    `SELECT
        a.attname AS column_name,
        REPLACE(format_type(a.atttypid, a.atttypmod), 'character varying', 'varchar') AS data_type, -- short type with length, user-friendly
        NOT a.attnotnull AS is_nullable,
        PG_GET_EXPR(d.adbin, d.adrelid) AS default_value,
        COALESCE(fk_info.fk_text, '') AS foreign_keys,
        fk_info.on_update,
        fk_info.on_delete,
        COALESCE(COL_DESCRIPTION(a.attrelid, a.attnum), '') AS column_comment
      FROM
        pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_type t ON a.atttypid = t.oid
        LEFT JOIN pg_attrdef d ON a.attrelid = d.adrelid
        AND a.attnum = d.adnum
        LEFT JOIN LATERAL (
          SELECT
            STRING_AGG(
              '→ ' || confrel.relname || '.' || af.attname ,
              '\n'
            ) AS fk_text,
            -- Trả về action cụ thể
            MAX(
              CASE rc.confdeltype
                WHEN 'a' THEN 'NO ACTION'
                WHEN 'r' THEN 'RESTRICT'
                WHEN 'c' THEN 'CASCADE'
                WHEN 'n' THEN 'SET NULL'
                WHEN 'd' THEN 'SET DEFAULT'
              END
            ) AS on_delete,
            MAX(
              CASE rc.confupdtype
                WHEN 'a' THEN 'NO ACTION'
                WHEN 'r' THEN 'RESTRICT'
                WHEN 'c' THEN 'CASCADE'
                WHEN 'n' THEN 'SET NULL'
                WHEN 'd' THEN 'SET DEFAULT'
              END
            ) AS on_update
          FROM
            pg_constraint rc
            JOIN pg_class confrel ON rc.confrelid = confrel.oid
            JOIN pg_attribute af ON af.attrelid = rc.confrelid
            AND af.attnum = rc.confkey[1]
          WHERE
            rc.conrelid = a.attrelid
            AND rc.contype = 'f'
            AND a.attnum = ANY (rc.conkey)
        ) fk_info ON TRUE
      WHERE
        c.relname = $1
        AND n.nspname = $2
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY
        a.attnum
    `,
    [body.tableName, body.schema]
  );

  return result;
});
