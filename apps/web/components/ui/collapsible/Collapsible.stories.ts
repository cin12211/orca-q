import { ref } from 'vue';
import { h } from 'vue';
import type { Meta, StoryObj } from '@storybook/vue3';
import { ChevronsUpDown } from 'lucide-vue-next';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './';

// Mock Icon because Collapsible example usually uses icons
const Icon = {
  setup() {
    return () => h(ChevronsUpDown, { class: 'size-4' });
  },
};

const meta = {
  title: 'UI/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Collapsible, CollapsibleContent, CollapsibleTrigger, Icon },
    setup() {
      const isOpen = ref(false);
      return { args, isOpen };
    },
    template: `
      <Collapsible
        v-model:open="isOpen"
        class="w-[350px] space-y-2 border p-4 rounded"
      >
        <div class="flex items-center justify-between space-x-4 px-4">
          <h4 class="text-sm font-semibold">
            @peduarte starred 3 repositories
          </h4>
          <CollapsibleTrigger as-child>
            <button class="flex size-9 w-9 p-0 items-center justify-center rounded-md border text-sm hover:bg-accent hover:text-accent-foreground">
               <Icon />
               <span class="sr-only">Toggle</span>
            </button>
          </CollapsibleTrigger>
        </div>
        <div class="rounded-md border px-4 py-3 font-mono text-sm">
          @radix-ui/primitives
        </div>
        <CollapsibleContent class="space-y-2">
          <div class="rounded-md border px-4 py-3 font-mono text-sm">
            @radix-ui/colors
          </div>
          <div class="rounded-md border px-4 py-3 font-mono text-sm">
            @stitches/react
          </div>
        </CollapsibleContent>
      </Collapsible>
    `,
  }),
};
