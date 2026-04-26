import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { getNativeExportDownload } from '~/server/infrastructure/database/backup/native-backup-jobs';

export default defineEventHandler(async event => {
  const jobId = getRouterParam(event, 'jobId');

  if (!jobId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Export job id is required.',
    });
  }

  const artifact = getNativeExportDownload(jobId);
  const fileStat = await stat(artifact.filePath);

  setHeader(event, 'Content-Type', artifact.contentType);
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${artifact.fileName}"`
  );
  setHeader(event, 'Content-Length', fileStat.size);

  return sendStream(event, createReadStream(artifact.filePath));
});
