import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseModule } from '~/core/constants/database-module';

export const sqlite3Manifest = {
  type: DatabaseClientType.SQLITE3,
  modules: [
    DatabaseModule.SCHEMAS,
    DatabaseModule.RAW_QUERY,
    DatabaseModule.QUICK_QUERY,
    DatabaseModule.ERD,
    DatabaseModule.TOOLS,
  ] as const,
} as const;
