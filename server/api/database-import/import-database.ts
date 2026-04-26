import type { ISSLConfig, ISSHConfig } from '~/components/modules/connection';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  ImportOptions,
  StartDatabaseTransferResponse,
} from '~/core/types';
import { createDatabaseHttpError } from '~/server/infrastructure/database/adapters/shared/error';
import { startNativeImportJob } from '~/server/infrastructure/database/backup/native-backup-jobs';

export default defineEventHandler(async event => {
  // Read multipart form data
  const formData = await readMultipartFormData(event);

  if (!formData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No form data received',
    });
  }

  // Extract fields from form data
  let dbConnectionString = '';
  let host = '';
  let port = '5432';
  let username = '';
  let password = '';
  let database = '';
  let serviceName = '';
  let filePath = '';
  let type: DatabaseClientType | undefined;
  let options: ImportOptions = {};
  let fileData: Buffer | null = null;
  let ssl: ISSLConfig | undefined;
  let ssh: ISSHConfig | undefined;

  for (const field of formData) {
    if (field.name === 'dbConnectionString') {
      dbConnectionString = field.data.toString();
    } else if (field.name === 'host') {
      host = field.data.toString();
    } else if (field.name === 'port') {
      port = field.data.toString();
    } else if (field.name === 'username') {
      username = field.data.toString();
    } else if (field.name === 'password') {
      password = field.data.toString();
    } else if (field.name === 'database') {
      database = field.data.toString();
    } else if (field.name === 'serviceName') {
      serviceName = field.data.toString();
    } else if (field.name === 'filePath') {
      filePath = field.data.toString();
    } else if (field.name === 'type') {
      type = field.data.toString() as DatabaseClientType;
    } else if (field.name === 'options') {
      try {
        options = JSON.parse(field.data.toString());
      } catch {
        options = {};
      }
    } else if (field.name === 'ssl') {
      try {
        ssl = JSON.parse(field.data.toString()) as ISSLConfig;
      } catch {
        ssl = undefined;
      }
    } else if (field.name === 'ssh') {
      try {
        ssh = JSON.parse(field.data.toString()) as ISSHConfig;
      } catch {
        ssh = undefined;
      }
    } else if (field.name === 'file' && field.filename) {
      fileData = field.data;
    }
  }

  if (!type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database type is required for import.',
    });
  }

  if (!dbConnectionString && !host && !filePath) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Database connection details are required',
    });
  }

  if (!fileData) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Backup file is required',
    });
  }

  const safeUploadName = (
    formData.find(field => field.name === 'file')?.filename || 'backup.sql'
  ).replace(/[^a-zA-Z0-9._-]+/g, '-');

  try {
    return (await startNativeImportJob({
      dbConnectionString,
      host,
      port,
      username,
      password,
      database,
      serviceName,
      filePath,
      type,
      options,
      ssl,
      ssh,
      fileData,
      uploadFileName: `${Date.now()}-${safeUploadName}`,
    })) satisfies StartDatabaseTransferResponse;
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createDatabaseHttpError(type, error);
  }
});
