import { StatementRunStatus, type ExplainAnalyzeOptionKey } from '../types';

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

// --- Multi-statement run ---

export const STATEMENT_STATUS_CONFIG: Record<
  StatementRunStatus,
  { label: string; icon: string; iconClass: string; hint?: string }
> = {
  [StatementRunStatus.PENDING]: {
    label: 'Pending',
    icon: 'hugeicons:clock-01',
    iconClass: 'text-muted-foreground',
    hint: 'Waiting for the previous statements.',
  },
  [StatementRunStatus.RUNNING]: {
    label: 'Running',
    icon: 'hugeicons:loading-03',
    iconClass: 'text-primary animate-spin',
  },
  [StatementRunStatus.SUCCESS]: {
    label: 'Done',
    icon: 'hugeicons:checkmark-circle-02',
    iconClass: 'text-green-600',
  },
  [StatementRunStatus.ERROR]: {
    label: 'Failed',
    icon: 'hugeicons:alert-02',
    iconClass: 'text-red-500',
  },
  [StatementRunStatus.SKIPPED]: {
    label: 'Skipped',
    icon: 'hugeicons:minus-sign-circle',
    iconClass: 'text-muted-foreground',
    hint: 'Not run because a previous statement failed.',
  },
  [StatementRunStatus.CANCELLED]: {
    label: 'Cancelled',
    icon: 'hugeicons:stop-circle',
    iconClass: 'text-muted-foreground',
    hint: 'Cancelled before it finished.',
  },
};

export const MULTI_STATEMENT_VIEW_ONLY_NOTE =
  'View only: editing is not supported when several statements run together. Open a statement in its own tab to edit its rows.';
