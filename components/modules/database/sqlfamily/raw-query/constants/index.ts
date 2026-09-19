import type { ExplainAnalyzeOptionKey } from '../interfaces';

export enum RawQueryEditorLayout {
  horizontal = 'horizontal',
  horizontalWithVariables = 'horizontalWithVariables',
  vertical = 'vertical',
}

export const RawQueryEditorDefaultSize = {
  content: 70,
  variables: 30,
  result: 30,
} as const;

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

// --- Custom Layout Types ---

export type LayoutSlot = 'content' | 'variables' | 'result';

export const SLOT_OPTIONS: readonly LayoutSlot[] = [
  'content',
  'variables',
  'result',
] as const;

export interface CustomLayoutPanel {
  /** Which slot does this panel render? */
  slot: LayoutSlot;
  /** Default size percentage (0-100) */
  defaultSize: number;
  /** Min size percentage */
  minSize: number;
  /** Max size percentage */
  maxSize: number;
}

export type LayoutDirection = 'horizontal' | 'vertical';

export interface CustomLayoutInnerSplit {
  /** Which panel index contains the nested split */
  panelIndex: number;
  direction: LayoutDirection;
  panels: CustomLayoutPanel[];
}

export interface CustomLayoutDefinition {
  id: string;
  name: string;
  /** 'horizontal' = side-by-side, 'vertical' = stacked top/bottom */
  direction: LayoutDirection;
  /** The panels at the top level split */
  panels: CustomLayoutPanel[];
  /** Optional nested split inside one panel */
  innerSplit?: CustomLayoutInnerSplit;
  createdAt: number;
}

export const MAX_CUSTOM_LAYOUTS = 10;
