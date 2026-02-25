import type { CommandPrefix, ParsedInput } from './commandEngine.types';

/**
 * Parse raw input string into prefix + query.
 * Uses longest-match-first to avoid "t:" matching before "tab:".
 */
export function parseInput(
  raw: string,
  prefixes: CommandPrefix[]
): ParsedInput {
  if (!raw) {
    return { prefix: null, query: '' };
  }

  // Sort by key length descending so "tab:" is checked before "t:"
  const sorted = [...prefixes].sort((a, b) => b.key.length - a.key.length);

  for (const prefix of sorted) {
    if (raw.startsWith(prefix.key)) {
      return {
        prefix,
        query: raw.slice(prefix.key.length).trimStart(),
      };
    }
  }

  return { prefix: null, query: raw };
}
