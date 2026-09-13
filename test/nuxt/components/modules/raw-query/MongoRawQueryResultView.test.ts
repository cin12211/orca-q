import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MongoRawQueryResultView from '~/components/modules/raw-query/mongo/components/MongoRawQueryResultView.vue';

describe('MongoRawQueryResultView', () => {
  it('renders result documents through the read-only collection list item', () => {
    const wrapper = mount(MongoRawQueryResultView, {
      props: {
        documents: [{ title: 'Alpha' }],
      },
      global: {
        stubs: {
          MongoCollectionListItem: {
            name: 'MongoCollectionListItem',
            props: ['document', 'documentLabel', 'isReadOnly'],
            template: '<div data-test="document">{{ documentLabel }}</div>',
          },
        },
      },
    });

    const document = wrapper.getComponent({ name: 'MongoCollectionListItem' });
    expect(document.props('document')).toEqual({ title: 'Alpha' });
    expect(document.props('documentLabel')).toBe('Document 1');
    expect(document.props('isReadOnly')).toBe(true);
  });
});
