import { computed, onBeforeUnmount, ref, shallowRef } from 'vue';
import { getBrokerErrorMessage } from '~/components/modules/message-broker';
import type { Connection } from '~/core/stores';
import type { BrokerMessage } from '~/core/types/broker-message.types';
import { KAFKA_LIVE_MAX_ROWS, KAFKA_LIVE_POLL_MS } from '../constants';
import { kafkaService } from '../services';

/** Start/stop a server-side tail session and poll it for new messages. */
export function useKafkaLive(connection: () => Connection) {
  const sessionId = ref<string | null>(null);
  const messages = shallowRef<BrokerMessage[]>([]);
  const error = ref<string | null>(null);
  const isStarting = ref(false);
  let lastSequence = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const isRunning = computed(() => Boolean(sessionId.value));

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const poll = async () => {
    if (!sessionId.value) return;

    try {
      const result = await kafkaService.pollLive(sessionId.value, lastSequence);
      lastSequence = result.lastSequence;

      if (result.messages.length) {
        // Newest first, capped so a busy topic does not grow the list forever.
        const newestFirst = [...result.messages].sort((left, right) =>
          (right.timestamp ?? '').localeCompare(left.timestamp ?? '')
        );
        messages.value = [...newestFirst, ...messages.value].slice(
          0,
          KAFKA_LIVE_MAX_ROWS
        );
      }

      if (!result.isRunning) {
        error.value = result.error;
        sessionId.value = null;
        return;
      }
    } catch (cause) {
      error.value = getBrokerErrorMessage(cause);
    }

    timer = setTimeout(poll, KAFKA_LIVE_POLL_MS);
  };

  const stop = async () => {
    clearTimer();
    const id = sessionId.value;
    sessionId.value = null;
    if (id) await kafkaService.stopLive(id).catch(() => undefined);
  };

  const start = async (topic: string, partitions?: number[]) => {
    await stop();
    isStarting.value = true;
    error.value = null;
    lastSequence = 0;

    try {
      const status = await kafkaService.startLive(
        connection(),
        topic,
        partitions
      );
      sessionId.value = status.sessionId;
      timer = setTimeout(poll, KAFKA_LIVE_POLL_MS);
    } catch (cause) {
      error.value = getBrokerErrorMessage(cause);
    } finally {
      isStarting.value = false;
    }
  };

  const clear = () => {
    messages.value = [];
  };

  onBeforeUnmount(() => {
    void stop();
  });

  return { messages, error, isRunning, isStarting, start, stop, clear };
}
