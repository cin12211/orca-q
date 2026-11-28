export const EDGE_ACTIVE_COLOR = 'var(--color-primary)';
export const EDGE_IDLE_COLOR = 'var(--color-zinc-400)';

export type EdgeMarkerKind = 'many' | 'zero-or-one';

export const buildSharedEdgeMarkerId = (
  prefix: string,
  kind: EdgeMarkerKind,
  active: boolean
) => `${prefix}-${kind}-${active ? 'active' : 'idle'}`;
