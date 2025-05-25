import { ipcMain } from 'electron';
import { getDatabaseSource } from '../utils/dbConnector';

ipcMain.handle(
  'db:connect',
  async (_, config: { dbConnectionString: string }) => {
    try {
      await getDatabaseSource({
        dbConnectionString: config.dbConnectionString,
        type: 'postgres',
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
);
