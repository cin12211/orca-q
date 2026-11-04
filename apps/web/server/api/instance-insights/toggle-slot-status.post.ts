import { createError, defineEventHandler, readBody } from 'h3';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  InstanceActionResponse,
  ReplicationSlotDesiredStatus,
  DatabaseMetadataRequestParams,
} from '~/core/types';
import { createInstanceInsightsAdapter } from '~/server/infrastructure/database/adapters/instance-insights';

interface RequestBody extends DatabaseMetadataRequestParams {
  slotName: string;
  desiredStatus: ReplicationSlotDesiredStatus;
  activePid?: number | null;
  slotType?: string | null;
}

export default defineEventHandler(
  async (event): Promise<InstanceActionResponse> => {
    try {
      const body = await readBody<RequestBody>(event);

      if (!body?.dbConnectionString && !body?.host) {
        throw createError({
          statusCode: 400,
          statusMessage: 'dbConnectionString or host is required',
        });
      }

      const adapter = await createInstanceInsightsAdapter(
        body.type,
        body
      );

      return await adapter.toggleReplicationSlotStatus({
        slotName: String(body.slotName || ''),
        desiredStatus: body.desiredStatus,
        activePid: body.activePid,
        slotType: body.slotType,
      });
    } catch (error: any) {
      throw createError({
        statusCode: error.statusCode || 500,
        statusMessage:
          error.statusMessage || 'Failed to toggle replication slot status',
        message: error.message,
      });
    }
  }
);
