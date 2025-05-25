import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

ipcMain.handle(
  'db:get-names',
  async (_, config: { dbConnectionString: string }) => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString: config.dbConnectionString,
        type: 'postgres',
      });

      const result = await db.query(
        `SELECT datname FROM pg_database WHERE datistemplate = false;`
      );
      return { success: true, data: result.rows };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
);
