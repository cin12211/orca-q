import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent, h } from 'vue';
import { describe, expect, it } from 'vitest';
import { ExplainOptionsMenu } from '~/components/modules/driver/postgres/raw-query/components';
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue';

describe('ExplainOptionsMenu', () => {
  it('emits run when the Explain button is clicked', async () => {
    const runs: number[] = [];
    const wrapper = await mountSuspended(
      defineComponent({
        render: () =>
          h(TooltipProvider, null, () =>
            h(ExplainOptionsMenu, {
              optionItems: [],
              serializeMode: 'NONE',
              onRun: () => runs.push(1),
            })
          ),
      })
    );

    const explainButton = wrapper
      .findAll('button.rounded-r-none')
      .find(button => button.text().includes('Explain'));
    expect(explainButton).toBeDefined();

    await explainButton!.trigger('click');

    expect(runs).toHaveLength(1);
  });
});
