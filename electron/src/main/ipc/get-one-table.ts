import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

ipcMain.handle(
  'db:get-one-table',
  async (_, config: { dbConnectionString: string; tableName: string }) => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString: config.dbConnectionString,
        type: 'postgres',
      });

      const result = await db.query(
        `SELECT * FROM ${config.tableName} LIMIT 100;`
      );
      return { success: true, data: result.rows };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
);
