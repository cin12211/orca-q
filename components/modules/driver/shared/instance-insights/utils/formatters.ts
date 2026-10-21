import {
  formatBytes as formatCoreBytes,
  formatNumber as formatCoreNumber,
} from '~/core/helpers';

export const formatNumber = (value: number | null | undefined) => {
  return formatCoreNumber(value ?? 0);
};

export const formatRate = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '0.00/s';
  return `${value.toFixed(2)}/s`;
};

export const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(2)}%`;
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const formatDuration = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return `${hours}h ${remainMinutes}m`;
};

export const formatBytes = (value: number | null | undefined) => {
  if (value === null || value === undefined || value <= 0) return '0 B';
  return formatCoreBytes(value).replace(' bytes', ' B');
};

export const compactSql = (sql: string | null | undefined) => {
  if (!sql) return '-';
  const normalized = sql.replace(/\s+/g, ' ').trim();
  if (!normalized) return '-';
  return normalized.length > 320
    ? `${normalized.slice(0, 320)}...`
    : normalized;
};

export const isIdleInTransaction = (stateText: string | null | undefined) =>
  (stateText || '').toLowerCase().includes('idle in transaction');
