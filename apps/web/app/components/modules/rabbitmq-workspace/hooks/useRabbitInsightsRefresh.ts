import { onBeforeUnmount, watch, type Ref } from 'vue';

/**
 * Reload a section when the panel's Refresh button bumps `refreshKey`, and
 * every `intervalMs` while the page is visible (0 turns it off).
 */
export function useRabbitInsightsRefresh(
  load: (options: { silent: boolean }) => Promise<void>,
  options: { refreshKey: Ref<number>; intervalMs: Ref<number> }
) {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  watch(
    options.intervalMs,
    intervalMs => {
      stop();
      if (intervalMs <= 0) return;

      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          void load({ silent: true });
        }
      }, intervalMs);
    },
    { immediate: true }
  );

  watch(options.refreshKey, () => load({ silent: false }));

  onBeforeUnmount(stop);
}
