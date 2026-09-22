import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import MongoRawQueryResultView from '~/components/modules/driver/mongodb/raw-query/components/MongoRawQueryResultView.vue';

describe('MongoRawQueryResultView', () => {
  it('shows the empty state when there are no documents', async () => {
    const wrapper = await mountSuspended(MongoRawQueryResultView, {
      props: { documents: [] },
    });

    expect(wrapper.text()).toContain('No Results');
  });

  it('renders the document list when there are documents', async () => {
    const wrapper = await mountSuspended(MongoRawQueryResultView, {
      props: { documents: [{ _id: '1', name: 'a' }] },
      global: {
        stubs: {
          MongoCollectionListView: {
            template: '<div data-testid="mongo-doc-list" />',
            props: ['documents'],
          },
        },
      },
    });

    expect(wrapper.find('[data-testid="mongo-doc-list"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('No Results');
  });
});
