import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import Input from './Input.vue';

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    defaultValue: { control: 'text' },
    size: {
      control: 'select',
      options: ['lg', 'default', 'sm', 'xs'],
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Input },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template:
      '<Input v-model="value" v-bind="args" placeholder="Type something..." />',
  }),
  args: {
    size: 'default',
  },
};

export const WithLabel: Story = {
  render: args => ({
    components: { Input },
    setup() {
      return { args };
    },
    template: `
      <div class="grid w-full max-w-sm items-center gap-1.5">
        <label for="email" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
        <Input id="email" type="email" placeholder="Email" v-bind="args" />
        <p class="text-sm text-muted-foreground">Enter your email address.</p>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    modelValue: 'Disabled input',
  } as any,
};

export const Sizes: Story = {
  render: () => ({
    components: { Input },
    setup() {
      return {
        values: {
          lg: 'Large input',
          default: 'Default input',
          sm: 'Small input',
          xs: 'Compact input',
        },
      };
    },
    template: `
      <div class="flex w-[320px] flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <span class="text-sm text-muted-foreground">lg</span>
          <Input v-model="values.lg" size="lg" />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm text-muted-foreground">default</span>
          <Input v-model="values.default" size="default" />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm text-muted-foreground">sm</span>
          <Input v-model="values.sm" size="sm" />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-sm text-muted-foreground">xs</span>
          <Input v-model="values.xs" size="xs" />
        </div>
      </div>
    `,
  }),
};
