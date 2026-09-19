import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseModule } from '~/core/constants/database-module';

export const mongoManifest = {
  type: DatabaseClientType.MONGODB,
  modules: [
    DatabaseModule.SCHEMAS,
    DatabaseModule.RAW_QUERY,
    DatabaseModule.QUICK_QUERY,
  ] as const,
} as const;
