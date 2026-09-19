import { DatabaseClientType } from '~/core/constants/database-client-type';
import { DatabaseModule } from '~/core/constants/database-module';

export const redisManifest = {
  type: DatabaseClientType.REDIS,
  modules: [
    DatabaseModule.SCHEMAS,
    DatabaseModule.RAW_QUERY,
    DatabaseModule.QUICK_QUERY,
    DatabaseModule.TOOLS,
  ] as const,
} as const;
