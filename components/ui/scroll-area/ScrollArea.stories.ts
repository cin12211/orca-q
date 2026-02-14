import type { Meta, StoryObj } from '@storybook/vue3';
import { Separator } from '../separator';
import { ScrollArea, ScrollBar } from './';

const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const tags = Array.from({ length: 50 }).map(
  (_, i, a) => `v1.2.0-beta.${a.length - i}`
);

export const Default: Story = {
  render: args => ({
    components: { ScrollArea, ScrollBar, Separator },
    setup() {
      return { args, tags };
    },
    template: `
      <ScrollArea class="h-72 w-48 rounded-md border">
        <div class="p-4">
          <h4 class="mb-4 text-sm font-medium leading-none">Tags</h4>
          <div v-for="tag in tags" :key="tag">
            <div class="text-sm">
              {{ tag }}
            </div>
            <Separator class="my-2" />
          </div>
        </div>
      </ScrollArea>
    `,
  }),
};
