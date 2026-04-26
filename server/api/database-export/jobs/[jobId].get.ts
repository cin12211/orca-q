import { getNativeBackupJobSnapshot } from '~/server/infrastructure/database/backup/native-backup-jobs';

export default defineEventHandler(event => {
  const jobId = getRouterParam(event, 'jobId');

  if (!jobId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Export job id is required.',
    });
  }

  return getNativeBackupJobSnapshot(jobId);
});
