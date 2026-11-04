import type { Meta, StoryObj } from '@storybook/vue3';
import Separator from './Separator.vue';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Separator },
    setup() {
      return { args };
    },
    template: `
      <div>
        <div class="space-y-1">
          <h4 class="text-sm font-medium leading-none">Radix Primitives</h4>
          <p class="text-sm text-muted-foreground">
            An open-source UI component library.
          </p>
        </div>
        <Separator class="my-4" v-bind="args" />
        <div class="flex h-5 items-center space-x-4 text-sm">
          <div>Blog</div>
          <Separator orientation="vertical" />
          <div>Docs</div>
          <Separator orientation="vertical" />
          <div>Source</div>
        </div>
      </div>
    `,
  }),
};

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
  render: args => ({
    components: { Separator },
    setup() {
      return { args };
    },
    template:
      '<div class="w-full text-center"><p>Above</p><Separator class="my-2" v-bind="args" /><p>Below</p></div>',
  }),
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  render: args => ({
    components: { Separator },
    setup() {
      return { args };
    },
    template:
      '<div class="flex h-20 items-center justify-center border rounded"><p>Left</p><Separator class="mx-4" v-bind="args" /><p>Right</p></div>',
  }),
};
