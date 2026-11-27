import { ErdLayoutAlgorithm } from '../types';

export const ROW_HEIGHT = 36;
export const ROW_WIDTH = 400;
export const HEAD_ROW_HEIGHT = 50;
export const HANDLE_HEIGHT = '20px';
export const HANDLE_LEFT = '-22px';
export const HEADER_HANDLE_TOP = '23px';
export const ERD_HEADER_HANDLE_SOURCE_ID = '__erd_header_handle_source__';
export const ERD_HEADER_HANDLE_TARGET_ID = '__erd_header_handle_target__';
export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 0.5;

export const DEFAULT_ZOOM_DURATION = 200;
export const DEFAULT_FOCUS_DURATION = 350;

export const DEFAULT_VUE_FLOW_LAYOUT_CONFIG = {
  HORIZONTAL_STEP: ROW_WIDTH + 200, // 384 + 100 (width + spacing)
  VERTICAL_STEP: 50, // 800 + 100 (height + spacing)
  NODE_TYPE: 'value',
  EDGE_TYPE: 'custom',
} as const;

export interface ErdLayoutOption {
  value: ErdLayoutAlgorithm;
  label: string;
  description: string;
  icon: string;
}

export const ERD_LAYOUT_OPTIONS: ErdLayoutOption[] = [
  {
    value: ErdLayoutAlgorithm.Default,
    label: 'Default',
    description:
      'Arrange tables around the focused table, with referenced tables on the left and referencing tables on the right.',
    icon: 'hugeicons:coordinate-01',
  },
  {
    value: ErdLayoutAlgorithm.LeftRight,
    label: 'Left to right',
    description:
      'Arrange tables left to right following their foreign-key relationships. Best for schemas with long relationship chains.',
    icon: 'hugeicons:arrow-right-double',
  },
  {
    value: ErdLayoutAlgorithm.Pipeline,
    label: 'Pipeline',
    description:
      'Arrange tables left to right along their data-dependency lineage. Table groups become stages ordered left to right, with their tables stacked vertically.',
    icon: 'hugeicons:workflow-square-03',
  },
  {
    value: ErdLayoutAlgorithm.Snowflake,
    label: 'Snowflake',
    description:
      'Arrange tables in a snowflake shape, with the most connected tables in the center. Ideal for densely connected diagrams like data warehouses.',
    icon: 'hugeicons:snow',
  },
  {
    value: ErdLayoutAlgorithm.Compact,
    label: 'Compact',
    description:
      'Arrange tables in a compact rectangle layout. Ideal for diagrams with few relationships and tables.',
    icon: 'hugeicons:grid-view',
  },
];
