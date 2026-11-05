import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

export const BROKER_AUTO_REFRESH_MS = 5000;

/**
 * Run `load` now and then every few seconds while enabled and the page is
 * visible, so background tabs do not keep hitting the broker.
 */
export function useAutoRefresh(
  load: (options: { silent: boolean }) => Promise<void>,
  options: { enabled?: Ref<boolean>; intervalMs?: number } = {}
) {
  const isEnabled = options.enabled ?? ref(true);
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const start = () => {
    stop();
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load({ silent: true });
      }
    }, options.intervalMs ?? BROKER_AUTO_REFRESH_MS);
  };

  watch(
    isEnabled,
    value => {
      if (value) start();
      else stop();
    },
    { immediate: true }
  );

  onBeforeUnmount(stop);

  return { isEnabled, stop, start };
}
