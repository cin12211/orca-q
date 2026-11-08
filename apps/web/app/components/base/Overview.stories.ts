import type { Meta, StoryObj } from '@storybook/vue3';
import OverviewShowcase from './OverviewShowcase.vue';

const meta = {
  title: 'Design System/Overview',
  component: OverviewShowcase,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Interactive visual catalog and playground for all built-in UI and custom Base components of the HeraQ Design System.',
      },
    },
  },
} satisfies Meta<typeof OverviewShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
