export type ParsedParametersResult =
  | { type: 'object'; values: Record<string, string> }
  | { type: 'array'; values: string[] }
  | { type: undefined; values: undefined };

// Recursive formatter
function formatValueRecursive(val: unknown): unknown {
  if (typeof val === 'string') {
    return `'${val}'`;
  }
  if (Array.isArray(val)) {
    return val.map(formatValueRecursive);
  }
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, formatValueRecursive(v)])
    );
  }
  return val; // number, boolean, null, undefined
}

function normalizeToJsonLike(input: string): string {
  return input
    .replace(/([{,]\s*)([a-zA-Z_]\w*|\d+)\s*:/g, '$1"$2":') // wrap keys in quotes
    .replace(/'/g, '"'); // normalize quotes
}

export function convertParameters(str: string): ParsedParametersResult {
  const paramsPart = str.replace(/^-- PARAMETERS:\s*/, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizeToJsonLike(paramsPart));
  } catch {
    return { type: undefined, values: undefined };
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return { type: undefined, values: undefined };
    }
    return { type: 'array', values: formatValueRecursive(parsed) as string[] };
  }

  if (parsed && typeof parsed === 'object') {
    const formatted = formatValueRecursive(parsed) as Record<string, string>;
    if (Object.keys(formatted).length === 0) {
      return { type: undefined, values: undefined };
    }
    return { type: 'object', values: formatted };
  }

  return { type: undefined, values: undefined };
}
