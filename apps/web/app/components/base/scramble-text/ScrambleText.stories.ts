import type { Meta, StoryObj } from '@storybook/vue3';
import ScrambleText from './ScrambleText.vue';

const meta = {
  title: 'Base/ScrambleText',
  component: ScrambleText,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
### ScrambleText Component

An animated, premium-looking scramble text transition component for Nuxt 3/Vue 3. It utilizes requestAnimationFrame and \`v-motion\` spring animations to deliver smooth character-by-character reveals.

- **Use Cases**: Dynamic headers, hacker/cyberpunk loading texts, visual cues for state transitions, eye-catching text rotations.
- **Under the Hood**: Calculates relative distance of character from string center to create a staggered, beautiful center-out reveal.
`,
      },
    },
  },
  argTypes: {
    texts: {
      description: 'An array of strings to cycle/scramble through',
      control: { type: 'object' },
      table: {
        type: { summary: 'string[]' },
        category: 'Props',
      },
    },
    duration: {
      description: 'The duration of the scrambling phase in milliseconds',
      control: { type: 'number', min: 200, max: 5000, step: 100 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '800' },
        category: 'Props',
      },
    },
    speed: {
      description:
        'Interval in milliseconds between character scrambling variations',
      control: { type: 'number', min: 10, max: 200, step: 5 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '55' },
        category: 'Props',
      },
    },
    loop: {
      description: 'Whether to cycle through the texts infinitely',
      control: { type: 'boolean' },
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
        category: 'Props',
      },
    },
    loopDelay: {
      description:
        'Delay in milliseconds between cycling to the next text in the array',
      control: { type: 'number', min: 100, max: 5000, step: 100 },
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '600' },
        category: 'Props',
      },
    },
  },
  args: {
    texts: [
      'ORCA QUERY',
      'DATABASE CLIENT',
      'VIBRANT WORKSPACES',
      'NEXT-GEN DATABASE PLATFORM',
    ],
    duration: 800,
    speed: 55,
    loop: true,
    loopDelay: 800,
  },
} satisfies Meta<typeof ScrambleText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The default story demonstrating cycling scramble texts with standard settings.
 */
export const Default: Story = {
  args: {},
  render: args => ({
    components: { ScrambleText },
    setup() {
      return { args };
    },
    template: `
      <div class="p-6 flex items-center justify-center bg-zinc-950 rounded-lg min-h-[150px] border border-zinc-800">
        <ScrambleText v-bind="args" class="text-3xl font-extrabold tracking-wider text-emerald-400 font-mono" />
      </div>
    `,
  }),
};

/**
 * A fast, rapid scramble effect. Shows how changing the `speed` and `duration` creates a high-energy glitch style.
 */
export const GlitchRapid: Story = {
  args: {
    duration: 400,
    speed: 20,
    loopDelay: 400,
    texts: ['ACCESS DENIED', 'BYPASS PROTOCOL', 'DECRYPTING CORRUPT DATA...'],
  },
  render: args => ({
    components: { ScrambleText },
    setup() {
      return { args };
    },
    template: `
      <div class="p-6 flex items-center justify-center bg-zinc-950 rounded-lg min-h-[150px] border border-zinc-800">
        <ScrambleText v-bind="args" class="text-2xl font-bold tracking-widest text-red-500 font-mono" />
      </div>
    `,
  }),
};

/**
 * A slow, atmospheric cinematic reveal with a long scramble phase.
 */
export const CinematicSlow: Story = {
  args: {
    duration: 2000,
    speed: 100,
    loopDelay: 2000,
    texts: ['IMAGINE THE FUTURE', 'EXPERIENCE PURE SPEED', 'WELCOME TO ORCAQ'],
  },
  render: args => ({
    components: { ScrambleText },
    setup() {
      return { args };
    },
    template: `
      <div class="p-6 flex items-center justify-center bg-zinc-950 rounded-lg min-h-[150px] border border-zinc-800">
        <ScrambleText v-bind="args" class="text-xl font-light tracking-[0.3em] text-zinc-100 uppercase" />
      </div>
    `,
  }),
};

/**
 * A single non-looping scramble animation. Good for landing page titles or interactive hover highlights.
 */
export const NonLooping: Story = {
  args: {
    loop: false,
    texts: ['INITIALIZING SECURE SESSION...'],
  },
  render: args => ({
    components: { ScrambleText },
    setup() {
      return { args };
    },
    template: `
      <div class="p-6 flex flex-col gap-4 items-center justify-center bg-zinc-950 rounded-lg min-h-[150px] border border-zinc-800">
        <ScrambleText v-bind="args" class="text-lg font-medium text-cyan-400 font-mono" />
        <p class="text-xs text-zinc-500">Press the Reset / Remount button in Storybook controls to replay</p>
      </div>
    `,
  }),
};
