import { createError, setHeader } from 'h3';
import type { H3Event } from 'h3';
import { BSON } from 'mongodb';
import { MONGO_RAW_QUERY_LIMITS } from '~/core/constants/mongodb-raw-query';
import type {
  MongoRawQueryRequest,
  MongoRawQueryStreamMessage,
} from '~/core/types/mongodb-raw-query.types';
import { withMongoDatabase } from '../mongodb.client';
import {
  mongoApprovalRegistry,
  createMongoApprovalBinding,
} from './mongo-approval-registry';
import { createMongoCapabilityHost } from './mongo-capability-host';
import { createMongoSandboxExecution } from './mongo-sandbox-runner';
import { compileMongoScript } from './mongo-script-policy';

const writeNdjson = (event: H3Event, value: MongoRawQueryStreamMessage) => {
  event.node.res.write(`${JSON.stringify(value)}\n`);
};

const validateRequest = (request: MongoRawQueryRequest) => {
  if (
    !request ||
    typeof request.script !== 'string' ||
    !request.connectionId ||
    !request.database
  ) {
    throw createError({
      statusCode: 400,
      message: 'connectionId, database, and script are required',
    });
  }
  if (
    Buffer.byteLength(request.script, 'utf8') >
    MONGO_RAW_QUERY_LIMITS.maxScriptBytes
  ) {
    throw createError({
      statusCode: 400,
      message: 'Mongo script exceeds the configured source limit',
    });
  }
  const paramsBytes = Buffer.byteLength(
    JSON.stringify(request.params ?? {}),
    'utf8'
  );
  if (paramsBytes > MONGO_RAW_QUERY_LIMITS.maxParamsBytes) {
    throw createError({
      statusCode: 400,
      message: 'Mongo parameters exceed the configured limit',
    });
  }
};

export async function streamMongoRawQuery(
  event: H3Event,
  request: MongoRawQueryRequest
): Promise<void> {
  validateRequest(request);
  setHeader(event, 'Content-Type', 'application/x-ndjson; charset=utf-8');
  setHeader(event, 'Cache-Control', 'no-cache');
  setHeader(event, 'Transfer-Encoding', 'chunked');
  setHeader(event, 'X-Content-Type-Options', 'nosniff');
  const startedAt = performance.now();
  let compiled;
  try {
    compiled = compileMongoScript(request.script);
  } catch (error) {
    writeNdjson(event, {
      type: 'error',
      phase: 'compile',
      message: error instanceof Error ? error.message : 'Invalid Mongo script',
    });
    event.node.res.end();
    return;
  }
  const binding = createMongoApprovalBinding(
    request,
    compiled.analysis.operations
  );
  const hasWrites = compiled.analysis.operations.some(
    operation => operation.risk === 'write' || operation.risk === 'destructive'
  );
  if (
    hasWrites &&
    (!request.approvalToken ||
      !mongoApprovalRegistry.consumeApproval(request.approvalToken, binding))
  ) {
    const challenge = mongoApprovalRegistry.createChallenge(binding);
    writeNdjson(event, {
      type: 'approval-required',
      challengeId: challenge.challengeId,
      operations: compiled.analysis.operations,
    });
    event.node.res.end();
    return;
  }

  try {
    await withMongoDatabase(request, async database => {
      const host = createMongoCapabilityHost(database, {
        approvedOperations: compiled.analysis.operations,
        maxDocuments: MONGO_RAW_QUERY_LIMITS.maxDocuments,
        maxValueBytes: MONGO_RAW_QUERY_LIMITS.maxValueBytes,
      });
      const execution = createMongoSandboxExecution({
        compiled,
        params: request.params ?? {},
        timeoutMs: Math.min(
          Math.max(
            request.timeoutMs ?? MONGO_RAW_QUERY_LIMITS.defaultTimeoutMs,
            1
          ),
          MONGO_RAW_QUERY_LIMITS.maxTimeoutMs
        ),
        onRpc: rpc => host.execute(rpc),
        onLog: entry => writeNdjson(event, { type: 'log', entry }),
      });
      try {
        const result = await execution.result;
        if (result.kind === 'cursor') {
          writeNdjson(event, {
            type: 'meta',
            resultKind: 'cursor',
            fields: [],
            command: 'MONGODB',
          });
          const streamed = await host.streamDescriptor(
            result.descriptor,
            rows => writeNdjson(event, { type: 'rows', data: rows })
          );
          writeNdjson(event, {
            type: 'done',
            rowCount: streamed.rowCount,
            queryTime: Number((performance.now() - startedAt).toFixed(2)),
            truncated: streamed.truncated,
          });
        } else {
          let value = result.value;
          try {
            value = BSON.EJSON.serialize(value, { relaxed: false });
          } catch {
            /* primitive fallback */
          }
          writeNdjson(event, {
            type: 'meta',
            resultKind: value === undefined ? 'void' : 'scalar',
            fields: [],
            command: 'MONGODB',
          });
          writeNdjson(event, { type: 'result', data: value });
          writeNdjson(event, {
            type: 'done',
            rowCount: value === undefined ? 0 : 1,
            queryTime: Number((performance.now() - startedAt).toFixed(2)),
            truncated: false,
          });
        }
      } finally {
        await host.closeAll();
      }
    });
  } catch (error: any) {
    writeNdjson(event, {
      type: 'error',
      phase: error?.phase === 'timeout' ? 'timeout' : 'execution',
      message:
        error instanceof Error ? error.message : 'Mongo execution failed',
    });
  } finally {
    event.node.res.end();
  }
}

export function approveMongoRawQuery(challengeId: string) {
  if (!challengeId)
    throw createError({ statusCode: 400, message: 'challengeId is required' });
  try {
    return mongoApprovalRegistry.approveChallenge(challengeId);
  } catch {
    throw createError({
      statusCode: 410,
      message: 'Approval challenge is missing or expired',
    });
  }
}
