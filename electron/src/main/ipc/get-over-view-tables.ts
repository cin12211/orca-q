import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

ipcMain.handle(
  'db:get-overview-tables',
  async (_, config: { dbConnectionString: string }) => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString: config.dbConnectionString,
        type: 'postgres',
      });

      const result = await db.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema');
      `);

      return { success: true, data: result.rows };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
);
