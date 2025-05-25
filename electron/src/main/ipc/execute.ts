import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

ipcMain.handle(
  'db:execute',
  async (_, payload: { dbConnectionString: string; sql: string }) => {
    const { dbConnectionString, sql } = payload;

    try {
      const db = await getDatabaseSource({
        dbConnectionString,
        type: 'postgres',
      });

      const result = await db.query(sql);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
);
