export function getMongoErrorMessage(
  error: unknown,
  fallbackMessage = 'Unknown error'
): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const err = error as {
      message?: string;
      data?: { message?: string; statusMessage?: string };
      response?: { _data?: { message?: string; statusMessage?: string } };
    };

    return (
      err.data?.message ||
      err.response?._data?.message ||
      err.data?.statusMessage ||
      err.response?._data?.statusMessage ||
      err.message ||
      fallbackMessage
    );
  }

  return fallbackMessage;
}
