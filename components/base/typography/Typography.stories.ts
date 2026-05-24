import type { Meta, StoryObj } from '@storybook/vue3';
import Typography from './Typography.vue';

const meta = {
  title: 'Base/Typography',
  component: Typography,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### Typography Component

A highly modular typography wrapper component based on **Class Variance Authority (CVA)**. It enforces a strict typography system across the application and replaces ad-hoc Tailwind classes with reusable, semantic primitives.

- **Supported Tags**: Runs on top of a dynamic tag mapping system (\`h1\`, \`h2\`, \`h3\`, \`p\`, \`blockquote\`).
- **Variants**: Supports 4 font weights and 8 scale levels.
- **Single Responsibility**: Adapts perfectly to context with fallback-rich defaults.
`,
      },
    },
  },
  argTypes: {
    type: {
      description: 'The HTML element / semantic variant type',
      control: { type: 'select' },
      options: ['h1', 'h2', 'h3', 'p', 'blockquote'],
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: `'p'` },
        category: 'Props',
      },
    },
    font: {
      description: 'Font weight scale',
      control: { type: 'select' },
      options: ['normal', 'semibold', 'bold', 'extrabold'],
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: `'normal'` },
        category: 'Props',
      },
    },
    size: {
      description: 'Text size scale mapping',
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'],
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: `'md'` },
        category: 'Props',
      },
    },
    default: {
      description: 'Slot content for the text',
      control: { type: 'text' },
      table: {
        type: { summary: 'Slot' },
        category: 'Slots',
      },
    },
  },
  args: {
    type: 'p',
    font: 'normal',
    size: 'md',
    default: 'The quick brown fox jumps over the lazy dog',
  },
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Standard text presentation with default properties.
 */
export const Default: Story = {
  args: {
    default:
      'This is standard paragraph text. Orca Query is a lightweight and blazing fast tool for relational database browsing, data manipulation, and structure designing.',
  },
  render: args => ({
    components: { Typography },
    setup() {
      return { args };
    },
    template: '<Typography v-bind="args">{{ args.default }}</Typography>',
  }),
};

/**
 * Showcase all semantic type variants side-by-side.
 */
export const SemanticTypes: Story = {
  render: () => ({
    components: { Typography },
    template: `
      <div class="space-y-6 max-w-2xl p-6 border rounded-lg bg-card">
        <div>
          <span class="text-xxs font-bold text-muted-foreground uppercase tracking-widest">Heading 1 (h1)</span>
          <Typography type="h1" font="extrabold">Database Explorer</Typography>
        </div>
        
        <div>
          <span class="text-xxs font-bold text-muted-foreground uppercase tracking-widest">Heading 2 (h2)</span>
          <Typography type="h2" font="bold">Schema Definition and Relations</Typography>
        </div>

        <div>
          <span class="text-xxs font-bold text-muted-foreground uppercase tracking-widest">Heading 3 (h3)</span>
          <Typography type="h3" font="semibold">Active Query Sessions</Typography>
        </div>

        <div>
          <span class="text-xxs font-bold text-muted-foreground uppercase tracking-widest">Paragraph (p)</span>
          <Typography type="p" font="normal" class="text-muted-foreground mt-1">
            Running raw SQL queries can be dangerous. Always make sure to verify the WHERE clause before executing updates or deletes on production environments.
          </Typography>
        </div>

        <div>
          <span class="text-xxs font-bold text-muted-foreground uppercase tracking-widest">Blockquote (blockquote)</span>
          <Typography type="blockquote" font="normal" class="border-l-2 border-primary pl-4 text-muted-foreground mt-2">
            "Software engineering is what happens to programming when you add time and other programmers." — Titus Winters
          </Typography>
        </div>
      </div>
    `,
  }),
};

/**
 * Shows the full typography scale sizes from sm up to 5xl.
 */
export const ScaleSizes: Story = {
  render: () => ({
    components: { Typography },
    setup() {
      const sizes = [
        'sm',
        'md',
        'lg',
        'xl',
        '2xl',
        '3xl',
        '4xl',
        '5xl',
      ] as const;
      return { sizes };
    },
    template: `
      <div class="space-y-6 p-6 border rounded-lg bg-card">
        <div v-for="size in sizes" :key="size" class="flex items-baseline gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0">
          <span class="w-16 text-xxs font-mono text-muted-foreground uppercase tracking-widest shrink-0">{{ size }}</span>
          <Typography type="p" :size="size" font="semibold" class="truncate">
            Typography size matching '{{ size }}'
          </Typography>
        </div>
      </div>
    `,
  }),
};

/**
 * Demonstrates the supported font weight configurations.
 */
export const FontWeights: Story = {
  render: () => ({
    components: { Typography },
    setup() {
      const weights = ['normal', 'semibold', 'bold', 'extrabold'] as const;
      return { weights };
    },
    template: `
      <div class="space-y-6 p-6 border rounded-lg bg-card max-w-xl">
        <div v-for="weight in weights" :key="weight" class="space-y-1">
          <span class="text-xxs font-mono text-muted-foreground uppercase tracking-widest">{{ weight }}</span>
          <Typography type="p" size="xl" :font="weight">
            Experience database tooling with Orca Query.
          </Typography>
        </div>
      </div>
    `,
  }),
};
