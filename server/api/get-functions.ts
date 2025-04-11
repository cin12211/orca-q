import { executeQuery } from "~/server/utils/db-connection";

export default defineEventHandler(async (event) => {
  //   const body: { query: string } = await readBody(event);
  const result = await executeQuery(`
        -- select nspname
        -- from pg_catalog.pg_namespace;
        -- show all table detail in schema (2)
        SELECT
            json_agg(
                json_build_object(
                    'schema',
                    n.nspname,
                    'function_name',
                    p.proname,
                    'return_type',
                    pg_catalog.format_type (p.prorettype, NULL),
                    'argument_types',
                    CASE
                        WHEN p.proargtypes IS NOT NULL THEN array_to_json(
                            ARRAY(
                                SELECT
                                    pg_catalog.format_type (unnest(p.proargtypes), NULL)
                            )
                        )
                        ELSE '[]'::json
                    END,
                    'language',
                    l.lanname,
                    'is_strict',
                    p.proisstrict,
                    'returns_set',
                    p.proretset,
                    'definition',
                    pg_catalog.pg_get_functiondef (p.oid),
                    'description',
                    d.description
                )
            ) AS functions_metadata
        FROM
            pg_catalog.pg_proc p
            JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
            JOIN pg_catalog.pg_language l ON l.oid = p.prolang
            LEFT JOIN pg_catalog.pg_description d ON d.objoid = p.oid
        WHERE
            n.nspname = current_schema()
            AND p.proname NOT LIKE 'pg_%' -- Optional: exclude system functions
            AND n.nspname NOT IN ('pg_catalog', 'information_schema');
    `);
  return {
    result,
  };
});
