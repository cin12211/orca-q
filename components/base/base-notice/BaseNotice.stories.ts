import type { Meta, StoryObj } from '@storybook/vue3';
import BaseNotice from './BaseNotice.vue';

const meta = {
  title: 'Base/BaseNotice',
  component: BaseNotice,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### BaseNotice Component

A clean, semantic notification component designed for rendering contextual notices, cautions, hints, or instructions. It matches Orca Query's minimalist design system with refined borders, subtle backgrounds, and an integrated info icon.

- **Variants**: Supports \`default\` (primary), \`secondary\` (muted grey), and \`destructive\` (danger red).
- **Slot Enabled**: Fully dynamic slot input allowing markdown, strings, or html templates.
`,
      },
    },
  },
  argTypes: {
    variant: {
      description: 'The visual variation style of the notice box',
      control: { type: 'select' },
      options: ['default', 'secondary', 'destructive'],
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: `'default'` },
        category: 'Props',
      },
    },
    default: {
      description: 'Slot content for the notice text/elements',
      control: { type: 'text' },
      table: {
        type: { summary: 'Slot' },
        category: 'Slots',
      },
    },
  },
  args: {
    variant: 'default',
    default:
      'Running custom scripts can result in irreversible modifications to the local schema state.',
  },
} satisfies Meta<typeof BaseNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Standard info notice styling.
 */
export const Default: Story = {
  args: {},
  render: args => ({
    components: { BaseNotice },
    setup() {
      return { args };
    },
    template: '<BaseNotice v-bind="args">{{ args.default }}</BaseNotice>',
  }),
};

/**
 * Muted gray notice for low-priority details or subtle descriptions.
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    default:
      'Local configurations are cached automatically. Changes take effect on the next application restart.',
  },
  render: args => ({
    components: { BaseNotice },
    setup() {
      return { args };
    },
    template: '<BaseNotice v-bind="args">{{ args.default }}</BaseNotice>',
  }),
};

/**
 * Red warning notice highlighting potential data loss, dangerous operations, or errors.
 */
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    default:
      'Critical warning: Dropping tables is highly destructive. All associated triggers and rows will be permanently deleted.',
  },
  render: args => ({
    components: { BaseNotice },
    setup() {
      return { args };
    },
    template: '<BaseNotice v-bind="args">{{ args.default }}</BaseNotice>',
  }),
};

/**
 * Demonstrates the rendering behavior when the notice spans multiple lines.
 */
export const LongContent: Story = {
  args: {
    default:
      'Before running massive migration batches, it is strongly recommended that you take a cold backup of the sqlite file. If any step fails, the transaction is automatically rolled back, but indices might remain partially modified depending on the dialect version in use.',
  },
  render: args => ({
    components: { BaseNotice },
    setup() {
      return { args };
    },
    template: `
      <div class="max-w-md">
        <BaseNotice v-bind="args">{{ args.default }}</BaseNotice>
      </div>
    `,
  }),
};

/**
 * Visual matrix comparing all variants stacked.
 */
export const AllVariants: Story = {
  render: () => ({
    components: { BaseNotice },
    template: `
      <div class="space-y-4 max-w-xl">
        <BaseNotice variant="default">
          <strong>Default:</strong> Connection has been established successfully. Speed index is 12ms.
        </BaseNotice>
        <BaseNotice variant="secondary">
          <strong>Secondary:</strong> System configuration has not been modified. Loading from local storage fallback.
        </BaseNotice>
        <BaseNotice variant="destructive">
          <strong>Destructive:</strong> Unauthorized access detected. Session credentials have expired.
        </BaseNotice>
      </div>
    `,
  }),
};
