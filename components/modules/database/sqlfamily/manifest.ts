import { DatabaseModule } from '~/core/constants/database-module';

// Shared SQL family manifest - used as template for postgres/maria/sqlite3
export const sqlfamilyManifest = {
  modules: [
    DatabaseModule.SCHEMAS,
    DatabaseModule.RAW_QUERY,
    DatabaseModule.QUICK_QUERY,
    DatabaseModule.ERD,
    DatabaseModule.ROLES,
    DatabaseModule.TOOLS,
  ] as const,
} as const;
