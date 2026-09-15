import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MongoCollectionListView from '~/components/modules/quick-query/mongodb/components/MongoCollectionListView.vue';
import MongoRawQueryApprovalDialog from '~/components/modules/raw-query/mongo/components/MongoRawQueryApprovalDialog.vue';
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
          MongoRawQueryApprovalDialog: {
            name: 'MongoRawQueryApprovalDialog',
            props: ['open', 'loading', 'operations'],
            template: '<div data-test="approval-dialog" />',
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

    const dialog = wrapper.getComponent(MongoRawQueryApprovalDialog);
    expect(dialog.props('open')).toBe(false);
  });

  it('renders MongoRawQueryApprovalDialog open when pendingApproval is provided and forwards events', async () => {
    const mockOperation = {
      id: 'op-1',
      target: 'collection' as const,
      method: 'drop',
      dynamicDatabase: false,
      dynamicTarget: false,
      risk: 'destructive' as const,
      summary: 'Drop collection',
    };

    const wrapper = mount(MongoRawQueryResultView, {
      props: {
        documents: [],
        pendingApproval: {
          challengeId: 'ch-test',
          operations: [mockOperation],
        },
      },
      global: {
        stubs: {
          BaseEmpty: {
            template: '<div data-test="empty" />',
          },
          MongoRawQueryApprovalDialog: {
            name: 'MongoRawQueryApprovalDialog',
            props: ['open', 'loading', 'operations'],
            emits: ['confirm', 'cancel'],
            template: '<div data-test="approval-dialog" />',
          },
        },
      },
    });

    const dialog = wrapper.getComponent(MongoRawQueryApprovalDialog);
    expect(dialog.props('open')).toBe(true);
    expect(dialog.props('operations')).toEqual([mockOperation]);

    dialog.vm.$emit('confirm');
    expect(wrapper.emitted('confirmApproval')).toHaveLength(1);

    dialog.vm.$emit('cancel');
    expect(wrapper.emitted('cancelApproval')).toHaveLength(1);
  });

  it('extracts documents and pending approval directly from RawQueryContext prop', async () => {
    const mockOperation = {
      id: 'op-context-1',
      target: 'collection' as const,
      method: 'drop',
      dynamicDatabase: false,
      dynamicTarget: false,
      risk: 'destructive' as const,
      summary: 'Drop test collection',
    };

    const confirmPendingWrite = vi.fn().mockResolvedValue(undefined);
    const cancelPendingWrite = vi.fn();

    const mockContext = {
      formattedData: [{ _id: 'doc-1', title: 'Context Item' }],
      dialectState: {
        badgeText: ref('Mongo Beta'),
        clickCount: ref(0),
        incrementCount: vi.fn(),
        resetCount: vi.fn(),
        pendingApproval: ref({
          challengeId: 'ch-context',
          operations: [mockOperation],
        }),
        confirmPendingWrite,
        cancelPendingWrite,
      },
    } as any;

    const wrapper = mount(MongoRawQueryResultView, {
      props: {
        context: mockContext,
      },
      global: {
        stubs: {
          MongoCollectionListView: {
            name: 'MongoCollectionListView',
            props: ['documents', 'isReadOnly', 'getDocumentLabel'],
            template: '<div data-test="list" />',
          },
          MongoRawQueryApprovalDialog: {
            name: 'MongoRawQueryApprovalDialog',
            props: ['open', 'loading', 'operations'],
            emits: ['confirm', 'cancel'],
            template: '<div data-test="approval-dialog" />',
          },
        },
      },
    });

    const list = wrapper.getComponent(MongoCollectionListView);
    expect(list.props('documents')).toEqual([
      { _id: 'doc-1', title: 'Context Item' },
    ]);

    const dialog = wrapper.getComponent(MongoRawQueryApprovalDialog);
    expect(dialog.props('open')).toBe(true);
    expect(dialog.props('operations')).toEqual([mockOperation]);

    dialog.vm.$emit('confirm');
    expect(confirmPendingWrite).toHaveBeenCalledTimes(1);

    dialog.vm.$emit('cancel');
    expect(cancelPendingWrite).toHaveBeenCalledTimes(1);
  });
});
