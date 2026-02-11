import type { Meta, StoryObj } from '@storybook/vue3';
import { Skeleton } from '@/components/ui/skeleton';
import TableSkeleton from './TableSkeleton.vue';

const meta = {
  title: 'Base/TableSkeleton',
  component: TableSkeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof TableSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { TableSkeleton },
    setup() {
      return { args };
    },
    template: `
      <div class="p-6 border rounded-lg bg-background">
        <TableSkeleton />
      </div>
    `,
  }),
  decorators: [
    (story, context) => {
      const { app } = context;
      app.component('Skeleton', Skeleton);
      return story();
    },
  ],
};
