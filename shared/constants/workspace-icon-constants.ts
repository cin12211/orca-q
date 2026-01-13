export const WORKSPACE_ICONS = [
  'lucide:badge',
  'lucide:building-2',
  'lucide:bone',
  'lucide:book',
  'lucide:brain-circuit',
  'lucide:circle-dashed',
  'lucide:chess-bishop',
  'lucide:chess-king',
  'lucide:chess-pawn',
  'lucide:chess-queen',
  'lucide:chess-rook',
  'lucide:fan',
  'lucide:skull',
  'lucide:ship-wheel',
  'lucide:bug',
  'lucide:hamburger',
] as const;

export const DEFAULT_WORKSPACE_ICON = WORKSPACE_ICONS[0];

export type WorkspaceIcon = (typeof WORKSPACE_ICONS)[number];
