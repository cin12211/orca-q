import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

ipcMain.handle(
  'db:get-source',
  async (_, config: { dbConnectionString: string }) => {
    try {
      const db = await getDatabaseSource({
        dbConnectionString: config.dbConnectionString,
        type: 'postgres',
      });

      return { success: true, data: db };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
);
