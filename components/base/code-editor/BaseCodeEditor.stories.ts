import { createPinia, setActivePinia } from 'pinia';
import type { Meta, StoryObj } from '@storybook/vue3';
import { useAppLayoutStore } from '~/core/stores/appLayoutStore';
import BaseCodeEditor from './BaseCodeEditor.vue';
import { EditorTheme } from './constants';

const meta = {
  title: 'Base/BaseCodeEditor',
  component: BaseCodeEditor,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: 'text' },
    readonly: { control: 'boolean' },
  },
} satisfies Meta<typeof BaseCodeEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

// Setup Pinia for the story
const pinia = createPinia();
setActivePinia(pinia);

// Mock store state if needed, or rely on default
const layoutStore = useAppLayoutStore();
layoutStore.codeEditorConfigs = {
  theme: EditorTheme.Dracula,
  fontSize: 14,
  showMiniMap: false,
  indentation: true,
};

export const Default: Story = {
  args: {
    modelValue: "console.log('Hello World');",
    readonly: false,
  },
  render: args => ({
    components: { BaseCodeEditor },
    setup() {
      return { args };
    },
    template:
      '<div class="h-[300px] border rounded"><BaseCodeEditor v-bind="args" /></div>',
  }),
  decorators: [
    (story, context) => {
      const { app } = context;
      app.use(pinia);
      return story();
    },
  ],
};

export const ReadOnly: Story = {
  args: {
    modelValue: '// This is read-only\nconst x = 10;',
    readonly: true,
  },
  render: args => ({
    components: { BaseCodeEditor },
    setup() {
      return { args };
    },
    template:
      '<div class="h-[300px] border rounded"><BaseCodeEditor v-bind="args" /></div>',
  }),
  decorators: [
    (story, context) => {
      const { app } = context;
      app.use(pinia);
      return story();
    },
  ],
};
