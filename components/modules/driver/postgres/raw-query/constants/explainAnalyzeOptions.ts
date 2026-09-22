import type { ExplainAnalyzeOptionKey } from '../types';

export const EXPLAIN_ANALYZE_OPTIONS: {
  key: ExplainAnalyzeOptionKey;
  label: string;
}[] = [
  { key: 'BUFFERS', label: 'Buffers' },
  { key: 'COSTS', label: 'Costs' },
  { key: 'GENERIC_PLAN', label: 'Generic Plan' },
  { key: 'MEMORY', label: 'Memory' },
  { key: 'SERIALIZE', label: 'Serialize' },
  { key: 'SETTINGS', label: 'Settings' },
  { key: 'SUMMARY', label: 'Summary' },
  { key: 'TIMING', label: 'Timing' },
  { key: 'VERBOSE', label: 'Verbose' },
  { key: 'WAL', label: 'Wal' },
];
