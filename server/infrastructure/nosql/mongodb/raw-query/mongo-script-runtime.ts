import type { CompiledMongoScript } from './mongo-script-policy';

export interface MongoScriptGlobals {
  db: unknown;
  params: unknown;
  ObjectId?: unknown;
  Decimal128?: unknown;
  Binary?: unknown;
  UUID?: unknown;
  BSON?: unknown;
  EJSON?: unknown;
  console: Pick<Console, 'log' | 'info' | 'warn' | 'error'>;
}

export type MongoScriptFunction = (
  globals: MongoScriptGlobals
) => unknown | Promise<unknown>;

export function createMongoScriptFunction(
  compiledCode: string
): MongoScriptFunction {
  const factory = globalThis.Function(
    '"use strict"; return ' + compiledCode + '\n'
  );
  const scriptFunction = factory();
  if (typeof scriptFunction !== 'function') {
    throw new Error('Compiled Mongo script did not produce a function');
  }
  return scriptFunction as MongoScriptFunction;
}

export async function executeMongoScript(
  compiled: Pick<CompiledMongoScript, 'code'>,
  globals: MongoScriptGlobals
) {
  return createMongoScriptFunction(compiled.code)(globals);
}
