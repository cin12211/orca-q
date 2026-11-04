export const BROKER_HEADERS_FORMAT_ERROR =
  'Headers must be a JSON object, for example {"source": "orcaq"}.';

/** Parse the optional headers textarea of the publish / produce dialogs. */
export function parseBrokerHeaders(
  text: string
): { headers: Record<string, string> } | { error: string } {
  if (!text.trim()) return { headers: {} };

  try {
    const parsed: unknown = JSON.parse(text);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: BROKER_HEADERS_FORMAT_ERROR };
    }

    return {
      headers: Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, String(value)])
      ),
    };
  } catch {
    return { error: BROKER_HEADERS_FORMAT_ERROR };
  }
}
