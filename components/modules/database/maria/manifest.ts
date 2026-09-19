import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseModule } from '~/core/constants/database-module';

export const mariaManifest = {
  type: DatabaseClientType.MARIADB,
  modules: [
    DatabaseModule.SCHEMAS,
    DatabaseModule.RAW_QUERY,
    DatabaseModule.QUICK_QUERY,
    DatabaseModule.ERD,
    DatabaseModule.ROLES,
    DatabaseModule.TOOLS,
  ] as const,
} as const;
