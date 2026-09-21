interface FetchErrorShape {
  data?: { message?: string };
  statusMessage?: string;
  message?: string;
}

/** Pulls the most specific message out of a `$fetch` / h3 error. */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;

  const { data, statusMessage, message } = error as FetchErrorShape;
  return data?.message || statusMessage || message || fallback;
}
