import { h } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import { Mail, ArrowRight, Loader2 } from 'lucide-vue-next';
import Button from './Button.vue';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon', 'xs', 'xxs', 'iconMd', 'iconSm'],
    },
    as: { control: 'text' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: '<Button v-bind="args">Button</Button>',
  }),
  args: {
    variant: 'default',
    size: 'default',
  },
};

export const Secondary: Story = {
  render: args => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: '<Button v-bind="args">Secondary</Button>',
  }),
  args: {
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  render: args => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: '<Button v-bind="args">Destructive</Button>',
  }),
  args: {
    variant: 'destructive',
  },
};

export const Outline: Story = {
  render: args => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: '<Button v-bind="args">Outline</Button>',
  }),
  args: {
    variant: 'outline',
  },
};

export const Ghost: Story = {
  render: args => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: '<Button v-bind="args">Ghost</Button>',
  }),
  args: {
    variant: 'ghost',
  },
};

export const Link: Story = {
  render: args => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: '<Button v-bind="args">Link</Button>',
  }),
  args: {
    variant: 'link',
  },
};

export const WithIcon: Story = {
  render: args => ({
    components: { Button, Mail },
    setup() {
      return { args };
    },
    template: `
      <div class="flex gap-4">
        <Button v-bind="args">
          <Mail class="mr-2 size-4" /> Login with Email
        </Button>
        <Button v-bind="args" variant="secondary">
          Next Step <ArrowRight class="ml-2 size-4" />
        </Button>
      </div>
    `,
  }),
};

export const Loading: Story = {
  render: args => ({
    components: { Button, Loader2 },
    setup() {
      return { args };
    },
    template: `
      <Button disabled>
        <Loader2 class="mr-2 size-4 animate-spin" />
        Please wait
      </Button>
    `,
  }),
};

export const IconSize: Story = {
  render: args => ({
    components: { Button, ArrowRight },
    setup() {
      return { args };
    },
    template: `
      <div class="flex gap-4 items-center">
        <Button size="icon">
          <ArrowRight class="size-4" />
        </Button>
        <Button size="iconMd">
          <ArrowRight class="size-4" />
        </Button>
        <Button size="iconSm">
          <ArrowRight class="size-4" />
        </Button>
      </div>
    `,
  }),
};
