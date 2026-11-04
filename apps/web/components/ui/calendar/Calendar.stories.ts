import { ref } from 'vue';
import {
  type DateValue,
  getLocalTimeZone,
  today,
} from '@internationalized/date';
import type { Meta, StoryObj } from '@storybook/vue3';
import Calendar from './Calendar.vue';

const meta = {
  title: 'UI/Calendar',
  component: Calendar,
  tags: ['autodocs'],
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => ({
    components: { Calendar },
    setup() {
      const value = ref<DateValue>(today(getLocalTimeZone()));
      return { args, value };
    },
    template: `
      <div class="p-4 border rounded w-fit">
        <Calendar v-model="value" class="rounded-md border" />
      </div>
    `,
  }),
};
