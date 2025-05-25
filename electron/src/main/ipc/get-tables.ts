import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

ipcMain.handle(
  'db:get-tables',
  async (_, config: { dbConnectionString: string }) => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString: config.dbConnectionString,
        type: 'postgres',
      });

      const result = await db.query(`
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
      `);

      return { success: true, data: result.rows };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
);
