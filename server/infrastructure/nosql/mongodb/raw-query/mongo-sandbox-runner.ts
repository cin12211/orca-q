import { Worker } from 'node:worker_threads';
import type {
  MongoSandboxRpcRequest,
  MongoSandboxRpcResponse,
} from './mongo-sandbox-protocol';
import { createMongoSandboxWorkerSource } from './mongo-sandbox-worker-source';
import type { CompiledMongoScript } from './mongo-script-policy';

export type MongoSandboxResult =
  | { kind: 'value'; value: unknown }
  | { kind: 'cursor'; descriptor: any };

export interface MongoSandboxExecutionOptions {
  compiled: CompiledMongoScript;
  params: unknown;
  timeoutMs: number;
  onRpc: (
    request: MongoSandboxRpcRequest
  ) => Promise<MongoSandboxRpcResponse> | MongoSandboxRpcResponse;
  onLog: (entry: any) => void;
}

export interface MongoSandboxExecution {
  result: Promise<MongoSandboxResult>;
  cancel(reason?: 'user' | 'timeout'): Promise<void>;
}

export function createMongoSandboxExecution(
  options: MongoSandboxExecutionOptions
): MongoSandboxExecution {
  let settled = false;
  let worker: Worker;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let resolveResult!: (value: MongoSandboxResult) => void;
  let rejectResult!: (error: Error & { phase?: string }) => void;
  const result = new Promise<MongoSandboxResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  const finish = (callback: () => void) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    callback();
    void worker?.terminate();
  };
  const workerOptions: any = {
    eval: true,
    workerData: { compiledCode: options.compiled.code, params: options.params },
  };
  if (!process.versions.bun)
    workerOptions.resourceLimits = { maxOldGenerationSizeMb: 128 };
  worker = new Worker(createMongoSandboxWorkerSource(), workerOptions);
  worker.on('message', message => {
    if (message.type === 'rpc') {
      Promise.resolve(options.onRpc(message.request))
        .then(response =>
          worker.postMessage({
            type: 'rpc-response',
            id: message.request.id,
            response,
          })
        )
        .catch(error =>
          worker.postMessage({
            type: 'rpc-response',
            id: message.request.id,
            response: { ok: false, error: error.message },
          })
        );
    } else if (message.type === 'log') options.onLog(message.entry);
    else if (message.type === 'result')
      finish(() => resolveResult(message.result));
    else if (message.type === 'error') {
      const error = Object.assign(new Error(message.error.message), {
        phase: 'execution',
        stack: message.error.stack,
      });
      finish(() => rejectResult(error));
    }
  });
  worker.on('error', error =>
    finish(() => rejectResult(Object.assign(error, { phase: 'execution' })))
  );
  timer = setTimeout(() => {
    const error = Object.assign(new Error('Mongo script timed out'), {
      phase: 'timeout',
    });
    finish(() => rejectResult(error));
  }, options.timeoutMs);
  return {
    result,
    cancel: async (reason = 'user') => {
      const error = Object.assign(
        new Error(
          reason === 'timeout'
            ? 'Mongo script timed out'
            : 'Mongo script cancelled'
        ),
        { phase: reason === 'timeout' ? 'timeout' : 'cancelled' }
      );
      finish(() => rejectResult(error));
    },
  };
}
