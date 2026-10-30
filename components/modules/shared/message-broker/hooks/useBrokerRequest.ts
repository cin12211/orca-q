import { ref, shallowRef } from 'vue';

/** Read the friendly message our broker routes put in `error.data`. */
export function getBrokerErrorMessage(error: unknown) {
  const data = (error as { data?: { message?: string; hint?: string } }).data;

  if (data?.message) {
    return data.hint ? `${data.message} ${data.hint}` : data.message;
  }

  return error instanceof Error ? error.message : 'Request failed.';
}

/** Loading / error state around one async loader. */
export function useBrokerRequest<T>(loader: () => Promise<T>) {
  const data = shallowRef<T | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const load = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) isLoading.value = true;

    try {
      data.value = await loader();
      error.value = null;
    } catch (cause) {
      error.value = getBrokerErrorMessage(cause);
    } finally {
      isLoading.value = false;
    }
  };

  return { data, isLoading, error, load };
}
