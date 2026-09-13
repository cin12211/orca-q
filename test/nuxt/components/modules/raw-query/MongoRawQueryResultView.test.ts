import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoCollectionListView from '~/components/modules/quick-query/mongodb/components/MongoCollectionListView.vue';
import MongoRawQueryResultView from '~/components/modules/raw-query/mongo/components/MongoRawQueryResultView.vue';

describe('MongoRawQueryResultView', () => {
  it('renders result documents through the read-only collection list item', () => {
    const wrapper = mount(MongoRawQueryResultView, {
      props: {
        documents: [{ title: 'Alpha' }],
      },
      global: {
        stubs: {
          MongoCollectionListView: {
            name: 'MongoCollectionListView',
            props: ['documents', 'isReadOnly', 'getDocumentLabel'],
            template: '<div data-test="list" />',
          },
        },
      },
    });

    const list = wrapper.getComponent(MongoCollectionListView);
    expect(list.props('documents')).toEqual([{ title: 'Alpha' }]);
    expect(list.props('isReadOnly')).toBe(true);
    expect(list.props('getDocumentLabel')({ title: 'Alpha' }, 0)).toBe(
      'Document 1'
    );
  });
});
