import type { KafkaMessageStart } from '~/core/types/kafka.types';

export const KAFKA_PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const KAFKA_LIVE_POLL_MS = 1000;
export const KAFKA_LIVE_MAX_ROWS = 500;

export const KAFKA_START_OPTIONS: {
  value: KafkaMessageStart;
  label: string;
}[] = [
  { value: 'latest', label: 'Newest' },
  { value: 'earliest', label: 'Oldest' },
  { value: 'offset', label: 'From offset' },
  { value: 'timestamp', label: 'From time' },
];

export const KAFKA_TAB_ICONS = {
  topic: 'hugeicons:message-multiple-01',
  group: 'hugeicons:user-multiple',
} as const;
