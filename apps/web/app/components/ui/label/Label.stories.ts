import type { Meta, StoryObj } from '@storybook/vue3';
import Label from './Label.vue';

const meta = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Label },
    setup() {
      return { args };
    },
    template: '<Label v-bind="args">Accept terms and conditions</Label>',
  }),
};

export const WithInput: Story = {
  render: args => ({
    components: { Label },
    template: `
      <div class="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="email">Email</Label>
        <input type="email" id="email" placeholder="Email" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
      </div>
    `,
  }),
};
