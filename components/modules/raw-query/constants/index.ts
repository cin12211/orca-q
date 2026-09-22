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
