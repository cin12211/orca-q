import type {
  CustomLayoutDefinition,
  LayoutSlot,
} from '~/components/modules/raw-query/constants';

export type LayoutPresetTemplate = {
  name: string;
  layout: Omit<CustomLayoutDefinition, 'id' | 'createdAt'>;
};

export const PRESET_TEMPLATES: LayoutPresetTemplate[] = [
  {
    name: 'Vertical',
    layout: {
      name: '',
      direction: 'vertical',
      panels: [
        { slot: 'content', defaultSize: 70, minSize: 30, maxSize: 100 },
        { slot: 'result', defaultSize: 30, minSize: 0, maxSize: 80 },
      ],
      innerSplit: {
        panelIndex: 0,
        direction: 'horizontal',
        panels: [
          { slot: 'content', defaultSize: 70, minSize: 20, maxSize: 100 },
          { slot: 'variables', defaultSize: 30, minSize: 0, maxSize: 70 },
        ],
      },
    },
  },
  {
    name: 'Horizontal',
    layout: {
      name: '',
      direction: 'horizontal',
      panels: [
        { slot: 'content', defaultSize: 50, minSize: 20, maxSize: 100 },
        { slot: 'result', defaultSize: 50, minSize: 0, maxSize: 80 },
      ],
    },
  },
  {
    name: 'Horizontal + Vars',
    layout: {
      name: '',
      direction: 'horizontal',
      panels: [
        { slot: 'content', defaultSize: 60, minSize: 20, maxSize: 100 },
        { slot: 'result', defaultSize: 40, minSize: 0, maxSize: 80 },
      ],
      innerSplit: {
        panelIndex: 0,
        direction: 'vertical',
        panels: [
          { slot: 'content', defaultSize: 70, minSize: 20, maxSize: 100 },
          { slot: 'variables', defaultSize: 30, minSize: 0, maxSize: 70 },
        ],
      },
    },
  },
];

export const SLOT_COLORS: Record<LayoutSlot, string> = {
  content: 'bg-accent border',
  variables: 'bg-accent border',
  result: 'bg-accent border',
};

export const SLOT_LABELS: Record<LayoutSlot, string> = {
  content: 'Editor',
  variables: 'Vars',
  result: 'Result',
};
