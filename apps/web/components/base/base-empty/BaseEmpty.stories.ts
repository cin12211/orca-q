import type { Meta, StoryObj } from '@storybook/vue3';
import BaseEmpty from './BaseEmpty.vue';

const meta = {
  title: 'Base/BaseEmpty',
  component: BaseEmpty,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    desc: { control: 'text' },
  },
} satisfies Meta<typeof BaseEmpty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No Data Found',
    desc: 'There are no items to display at this time.',
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'No Data',
  },
};

export const CustomContent: Story = {
  args: {
    title: 'No files',
    desc: 'Create a new file to get started.',
  },
};
