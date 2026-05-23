import type { Meta, StoryObj } from '@storybook/vue3';
import LoadingOverlay from './LoadingOverlay.vue';

const meta = {
  title: 'Base/LoadingOverlay',
  component: LoadingOverlay,
  tags: ['autodocs'],
  argTypes: {
    visible: { control: 'boolean' },
  },
} satisfies Meta<typeof LoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    visible: true,
  },
  render: args => ({
    components: { LoadingOverlay },
    setup() {
      return { args };
    },
    template: `
      <div class="relative h-40 w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border rounded p-4">
        <p class="text-muted-foreground">Content behind overlay</p>
        <LoadingOverlay v-bind="args" />
      </div>
    `,
  }),
};
