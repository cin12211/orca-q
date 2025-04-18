import { executeQuery } from '~/server/utils/db-connection';
import type { RoutineQueryResult } from './get-over-view-tables';

export default defineEventHandler(
  async (event): Promise<RoutineQueryResult> => {
    const result = await executeQuery(`
        SELECT 
            r.routine_name AS name,
            r.routine_schema AS schema,
            r.routine_type AS kind,
            pg_get_userbyid(p.proowner) AS owner,
            d.description AS comment
        FROM 
            information_schema.routines r
        JOIN 
            pg_proc p ON r.specific_name = p.proname || '_' || p.oid
        LEFT JOIN 
            pg_description d ON d.objoid = p.oid
        WHERE 
            r.routine_schema = 'public';
    `);
    return {
      result,
    };
  }
);
