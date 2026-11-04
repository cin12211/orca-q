import type { Meta, StoryObj } from '@storybook/vue3';
import { Kbd } from './';

const meta = {
  title: 'UI/Kbd',
  component: Kbd,
  tags: ['autodocs'],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Kbd },
    template: '<Kbd>⌘ K</Kbd>',
  }),
};

export const Combination: Story = {
  render: args => ({
    components: { Kbd },
    template: `
      <div class="flex gap-2">
        <Kbd>Ctrl</Kbd>
        <span>+</span>
        <Kbd>Shift</Kbd>
        <span>+</span>
        <Kbd>P</Kbd>
      </div>
    `,
  }),
};
