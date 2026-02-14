import { ref } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import Checkbox from './Checkbox.vue';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Checkbox },
    setup() {
      const checked = ref(false);
      return { args, checked };
    },
    template: '<Checkbox v-model:checked="checked" v-bind="args" />',
  }),
};

export const WithText: Story = {
  render: args => ({
    components: { Checkbox },
    setup() {
      const checked = ref(true);
      return { args, checked };
    },
    template: `
      <div class="items-top flex space-x-2">
        <Checkbox id="terms1" v-model:checked="checked" />
        <div class="grid gap-1.5 leading-none">
          <label
            for="terms1"
            class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Accept terms and conditions
          </label>
          <p class="text-sm text-muted-foreground">
            You agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    `,
  }),
};

export const Disabled: Story = {
  render: args => ({
    components: { Checkbox },
    setup() {
      return { args };
    },
    template: `
      <div class="flex items-center space-x-2">
        <Checkbox id="terms2" disabled />
        <label
          for="terms2"
          class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Accept terms and conditions
        </label>
      </div>
    `,
  }),
};
