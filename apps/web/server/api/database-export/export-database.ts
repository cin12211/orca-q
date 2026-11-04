import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ExportDatabaseRequest,
  StartDatabaseTransferResponse,
} from '~/core/types';
import { createDatabaseHttpError } from '~/server/infrastructure/database/adapters/shared/error';
import { startNativeExportJob } from '~/server/infrastructure/database/backup/native-backup-jobs';

export default defineEventHandler(async event => {
  const body: ExportDatabaseRequest & {
    host?: string;
    port?: string;
    username?: string;
    password?: string;
    database?: string;
    serviceName?: string;
    filePath?: string;
    type?: DatabaseClientType;
    ssl?: ISSLConfig;
    ssh?: ISSHConfig;
  } = await readBody(event);

  if (!body.type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database type is required for export.',
    });
  }

  try {
    return (await startNativeExportJob(
      body
    )) satisfies StartDatabaseTransferResponse;
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createDatabaseHttpError(body.type, error);
  }
});
