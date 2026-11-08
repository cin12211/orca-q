import type { Meta, StoryObj } from '@storybook/vue3';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './';

const meta = {
  title: 'UI/Resizable',
  component: ResizablePanelGroup,
  tags: ['autodocs'],
  argTypes: {
    direction: { control: 'select', options: ['horizontal', 'vertical'] },
  },
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    direction: 'horizontal',
    class: 'max-w-md rounded-lg border',
  },
  render: args => ({
    components: {
      ResizableHandle,
      ResizablePanel,
      ResizablePanelGroup,
    },
    setup() {
      return { args };
    },
    template: `
      <ResizablePanelGroup v-bind="args">
        <ResizablePanel :default-size="50">
          <div class="flex h-[200px] items-center justify-center p-6">
            <span class="font-semibold">One</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel :default-size="50">
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel :default-size="25">
              <div class="flex h-full items-center justify-center p-6">
                <span class="font-semibold">Two</span>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel :default-size="75">
              <div class="flex h-full items-center justify-center p-6">
                <span class="font-semibold">Three</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    `,
  }),
};
