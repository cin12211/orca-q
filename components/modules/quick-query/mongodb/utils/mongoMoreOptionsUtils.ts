import type {
  MongoQueryMoreOptionsPayload,
  MongoQueryMoreOptionsRawInput,
} from '../types';
import { parseMongoDocumentInput } from './mongoEjsonUtils';

export interface MongoMoreOptionsParseResult {
  payload: MongoQueryMoreOptionsPayload;
  errors: Partial<Record<keyof MongoQueryMoreOptionsRawInput, string>>;
}

function formatJsonError(err: unknown): string {
  if (err instanceof Error) {
    return err.message.toLowerCase().includes('invalid json')
      ? err.message
      : `Invalid JSON: ${err.message}`;
  }
  return 'Invalid JSON syntax';
}

export function parseMongoMoreOptionsInput(
  raw: MongoQueryMoreOptionsRawInput
): MongoMoreOptionsParseResult {
  const payload: MongoQueryMoreOptionsPayload = {};
  const errors: Partial<Record<keyof MongoQueryMoreOptionsRawInput, string>> =
    {};

  // Project
  const rawProject = raw.project?.trim();
  if (rawProject && rawProject !== '{}') {
    try {
      const parsed = parseMongoDocumentInput(rawProject);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        payload.project = parsed as Record<string, unknown>;
      } else {
        errors.project = 'Project must be a JSON object';
      }
    } catch (err: unknown) {
      errors.project = formatJsonError(err);
    }
  }

  // Sort
  const rawSort = raw.sort?.trim();
  if (rawSort && rawSort !== '{}') {
    try {
      const parsed = parseMongoDocumentInput(rawSort);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        payload.sort = parsed as Record<string, 1 | -1 | unknown>;
      } else {
        errors.sort = 'Sort must be a JSON object';
      }
    } catch (err: unknown) {
      errors.sort = formatJsonError(err);
    }
  }

  // Collation
  const rawCollation = raw.collation?.trim();
  if (rawCollation && rawCollation !== '{}') {
    try {
      const parsed = parseMongoDocumentInput(rawCollation);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        payload.collation = parsed as Record<string, unknown>;
      } else {
        errors.collation = 'Collation must be a JSON object';
      }
    } catch (err: unknown) {
      errors.collation = formatJsonError(err);
    }
  }

  // Index Hint
  const rawHint = raw.hint?.trim();
  if (rawHint && rawHint !== '—' && rawHint !== '-') {
    if (rawHint.startsWith('{')) {
      try {
        const parsed = parseMongoDocumentInput(rawHint);
        if (typeof parsed === 'object' && parsed !== null) {
          payload.hint = parsed as Record<string, unknown>;
        } else {
          payload.hint = rawHint;
        }
      } catch (err: unknown) {
        errors.hint = formatJsonError(err);
      }
    } else {
      payload.hint = rawHint;
    }
  }

  // Max Time MS
  if (raw.maxTimeMS !== undefined && raw.maxTimeMS !== '') {
    const num = Number(raw.maxTimeMS);
    if (!Number.isNaN(num) && num > 0) {
      payload.maxTimeMS = Math.floor(num);
    } else if (String(raw.maxTimeMS).trim() !== '') {
      errors.maxTimeMS = 'Max Time MS must be a positive number';
    }
  }

  return { payload, errors };
}
