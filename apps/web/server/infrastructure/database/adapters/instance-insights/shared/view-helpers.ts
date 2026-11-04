import type {
  InstanceInsightsActionCapability,
  InstanceInsightsCapabilities,
  InstanceInsightsSection,
  InstanceInsightsSectionId,
  InstanceInsightsTable,
  InstanceInsightsTableColumn,
  InstanceInsightsTableValue,
} from '~/core/types';

const DEFAULT_CAPABILITIES: InstanceInsightsCapabilities = {
  supportsSessionInspection: false,
  supportsLockInspection: false,
  supportsConfiguration: false,
  supportsReplication: false,
  supportsDataGuard: false,
  supportsStorageHealth: false,
  supportsIntegrityChecks: false,
  supportsMemoryLimits: false,
  supportsCancelQuery: false,
  supportsTerminateConnection: false,
  supportsReplicationActions: false,
};

export function createInsightsCapabilities(
  overrides: Partial<InstanceInsightsCapabilities> = {}
): InstanceInsightsCapabilities {
  return {
    ...DEFAULT_CAPABILITIES,
    ...overrides,
  };
}

export function createActionCapability(
  action: InstanceInsightsActionCapability
): InstanceInsightsActionCapability {
  return action;
}

export function createUnavailableSection(
  id: InstanceInsightsSectionId,
  title: string,
  subtitle: string,
  statusMessage: string,
  capturedAt: string
): InstanceInsightsSection {
  return {
    id,
    title,
    subtitle,
    status: 'unavailable',
    statusMessage,
    capturedAt,
    tables: [],
  };
}

export function createUnsupportedSection(
  id: InstanceInsightsSectionId,
  title: string,
  subtitle: string,
  statusMessage: string,
  capturedAt: string
): InstanceInsightsSection {
  return {
    id,
    title,
    subtitle,
    status: 'unsupported',
    statusMessage,
    capturedAt,
    tables: [],
  };
}

export function toTitleLabel(key: string): string {
  return key
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function createColumns(
  keys: readonly string[]
): InstanceInsightsTableColumn[] {
  return keys.map(key => ({
    key,
    label: toTitleLabel(key),
  }));
}

export function normalizeTableValue(
  value: unknown
): InstanceInsightsTableValue {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value
      .map(item => (item === null || item === undefined ? '' : String(item)))
      .filter(Boolean)
      .join(', ');
  }

  return JSON.stringify(value);
}

export function createTable(args: {
  id: string;
  title: string;
  description?: string | null;
  emptyMessage?: string | null;
  rows: Array<Record<string, unknown>>;
  columnKeys?: readonly string[];
}): InstanceInsightsTable {
  const rows = args.rows.map(row => {
    const normalized: Record<string, InstanceInsightsTableValue> = {};

    for (const [key, value] of Object.entries(row)) {
      normalized[key] = normalizeTableValue(value);
    }

    return normalized;
  });

  const keys =
    args.columnKeys && args.columnKeys.length > 0
      ? [...args.columnKeys]
      : Array.from(new Set(rows.flatMap(row => Object.keys(row))));

  return {
    id: args.id,
    title: args.title,
    description: args.description,
    emptyMessage: args.emptyMessage,
    columns: createColumns(keys),
    rows,
  };
}

export function formatNumber(value: unknown, digits = 0): string {
  const numeric =
    typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

  if (!Number.isFinite(numeric)) {
    return '-';
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(numeric);
}

export function formatPercent(value: unknown, digits = 1): string {
  const numeric =
    typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

  if (!Number.isFinite(numeric)) {
    return '-';
  }

  return `${formatNumber(numeric, digits)}%`;
}

export function formatBytes(value: unknown): string {
  const numeric =
    typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

  if (!Number.isFinite(numeric)) {
    return '-';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = Math.max(numeric, 0);
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : 2;
  return `${formatNumber(size, digits)} ${units[unitIndex]}`;
}

export function formatDateTime(value: unknown): string {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

export function formatDurationSeconds(value: unknown): string {
  const numeric =
    typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

  if (!Number.isFinite(numeric) || numeric < 0) {
    return '-';
  }

  const totalSeconds = Math.round(numeric);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatBoolean(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value === null || value === undefined) {
    return '-';
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'on', 'true', 'yes'].includes(normalized)) {
    return 'Yes';
  }

  if (['0', 'off', 'false', 'no'].includes(normalized)) {
    return 'No';
  }

  return String(value);
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'number') {
    const digits = Number.isInteger(value) ? 0 : 2;
    return formatNumber(value, digits);
  }

  if (Array.isArray(value)) {
    return value.map(item => formatValue(item)).join(', ');
  }

  return String(value);
}
