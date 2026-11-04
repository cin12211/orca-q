import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BrokerConnectionError } from '~/server/infrastructure/nosql/broker/broker-connection';

export function jsonResult(value: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof BrokerConnectionError) {
    return error.hint ? `${error.message}\nHint: ${error.hint}` : error.message;
  }

  return error instanceof Error ? error.message : String(error);
}

export function errorResult(error: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: toErrorMessage(error) }],
    isError: true,
  };
}

export async function withToolErrors(
  run: () => Promise<CallToolResult>
): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    return errorResult(error);
  }
}
