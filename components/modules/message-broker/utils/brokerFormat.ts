import {
  formatBytes,
  formatDateTime,
  formatDuration,
  formatNumber,
} from '~/components/modules/instance-insights/utils/formatters';

export { formatBytes, formatDateTime, formatNumber };

export const formatMessageRate = (value: number | null | undefined) =>
  value === null || value === undefined ? '-' : `${value.toFixed(1)}/s`;

export const formatRatio = (value: number | null | undefined) =>
  value === null || value === undefined ? '-' : `${Math.round(value * 100)}%`;

/** Whole seconds as "45s", "3m 20s" or "2h 5m". */
export const formatSeconds = (totalSeconds: number) =>
  formatDuration(Math.ceil(totalSeconds));

/**
 * Rough time until a backlog is consumed at the current net rate
 * (deliver minus publish). Null when the backlog is not shrinking.
 */
export function estimateDrainSeconds(input: {
  backlog: number;
  deliverRate: number | null;
  publishRate: number | null;
}) {
  if (input.backlog <= 0) return 0;

  const netRate = (input.deliverRate ?? 0) - (input.publishRate ?? 0);
  return netRate > 0 ? input.backlog / netRate : null;
}
