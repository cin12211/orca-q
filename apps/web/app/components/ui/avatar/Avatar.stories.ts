import type { Meta, StoryObj } from '@storybook/vue3';
import { Avatar, AvatarImage, AvatarFallback } from './';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Avatar, AvatarImage, AvatarFallback },
    template: `
      <Avatar>
        <AvatarImage src="https://github.com/radix-vue.png" alt="@radix-vue" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    `,
  }),
};

export const Fallback: Story = {
  render: args => ({
    components: { Avatar, AvatarImage, AvatarFallback },
    template: `
      <Avatar>
        <AvatarImage src="/broken-image.jpg" alt="@radix-vue" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    `,
  }),
};
