export const ROW_HEIGHT = 36;
export const ROW_WIDTH = 400;
export const HEAD_ROW_HEIGHT = 50;
export const HANDLE_HEIGHT = '20px';
export const HANDLE_LEFT = '-22px';
export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 0.5;

export const DEFAULT_VUE_FLOW_LAYOUT_CONFIG = {
  HORIZONTAL_STEP: ROW_WIDTH + 200, // 384 + 100 (width + spacing)
  VERTICAL_STEP: 50, // 800 + 100 (height + spacing)
  NODE_TYPE: 'value',
  EDGE_TYPE: 'custom',
} as const;
