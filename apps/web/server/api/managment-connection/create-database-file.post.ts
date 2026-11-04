import { createError, defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~~/app/core/constants/database-client-type';
import type { DatabaseFileOptions } from '~~/app/core/constants/database-file-options';
import { createDatabaseFile } from '~~/server/infrastructure/driver/db-connection/create-database-file';

interface RequestBody {
  type: DatabaseClientType;
  directory: string;
  fileName: string;
  options?: DatabaseFileOptions;
}

export default defineEventHandler(async event => {
  const { type, directory, fileName, options } =
    await readBody<RequestBody>(event);

  if (!type || !directory || !fileName) {
    throw createError({
      statusCode: 400,
      message: 'type, directory and fileName are required',
    });
  }

  return {
    filePath: await createDatabaseFile({ type, directory, fileName, options }),
  };
});
