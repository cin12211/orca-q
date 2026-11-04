import { createError } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import { getNativeBackupRuntimeCapability } from '~/server/infrastructure/database/backup/native-backup';

export default defineEventHandler(async event => {
  const rawType = getQuery(event).type;
  const typeValue = Array.isArray(rawType) ? rawType[0] : rawType;
  const rawDiscoverAll = getQuery(event).discoverAll;
  const discoverAllValue = Array.isArray(rawDiscoverAll)
    ? rawDiscoverAll[0]
    : rawDiscoverAll;

  if (
    typeof typeValue === 'string' &&
    !Object.values(DatabaseClientType).includes(typeValue as DatabaseClientType)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid database type: ${typeValue}`,
    });
  }

  return getNativeBackupRuntimeCapability(
    (typeValue as DatabaseClientType | undefined) || undefined,
    {
      discoverAll: discoverAllValue === 'true',
    }
  );
});
