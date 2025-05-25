import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

ipcMain.handle(
  'db:get-functions',
  async (_, config: { dbConnectionString: string }) => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString: config.dbConnectionString,
        type: 'postgres',
      });

      const result = await db.query(`
        SELECT proname, pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema');
      `);

      return { success: true, data: result.rows };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
);
