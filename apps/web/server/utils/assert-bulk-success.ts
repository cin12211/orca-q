import { createError } from 'h3';
import type { BulkUpdateResponse } from '~~/app/core/types';

const BULK_FAILED_STATUS = 422;

/**
 * Table adapters report a failed transaction as `success: false`, but clients
 * only treat HTTP errors as failures, so a 200 would read as "saved".
 */
export function assertBulkSuccess(
  result: BulkUpdateResponse
): BulkUpdateResponse {
  if (result.success) {
    return result;
  }

  const message = result.error || 'Failed to execute statements';

  throw createError({
    statusCode: BULK_FAILED_STATUS,
    statusMessage: 'Failed to execute statements',
    message,
    data: { driverError: { message } },
  });
}
