import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AgTextCellEditor from '~/components/base/data-grid/components/AgTextCellEditor.vue';
import PreviewSelectedRow from '~/components/modules/quick-query/preview/PreviewSelectedRow.vue';

const utf8 = (text: string) => ({
  type: 'Buffer',
  data: Array.from(new TextEncoder().encode(text)),
});

const columnTypes = [
  { name: 'id', type: 'int4' },
  { name: 'avatar', type: 'bytea' },
  { name: 'payload', type: 'blob' },
  { name: 'note', type: 'text' },
];

const mountPreview = (selectedRow: Record<string, unknown>) =>
  mount(PreviewSelectedRow, {
    props: { columnTypes, selectedRow },
    global: { stubs: { Icon: true } },
  });

const viewerFor = (wrapper: ReturnType<typeof mountPreview>, field: string) =>
  wrapper
    .findAllComponents(AgTextCellEditor)
    .find(
      viewer => viewer.props('value') === wrapper.props('selectedRow')?.[field]
    );

const viewerText = (viewer: ReturnType<typeof viewerFor>) =>
  (
    viewer!.find('[data-test="text-editor-input"]')
      .element as HTMLTextAreaElement
  ).value;

describe('PreviewSelectedRow - binary fields', () => {
  it('renders binary fields with the AgTextCellEditor viewer, decoded', async () => {
    const wrapper = mountPreview({
      id: 1,
      avatar: { type: 'Buffer', data: [0x89, 0x50, 0x4e, 0x47] },
      payload: utf8('Xin chào'),
      note: 'hello',
    });
    await flushPromises();

    const viewers = wrapper.findAllComponents(AgTextCellEditor);
    expect(viewers).toHaveLength(2);

    const avatar = viewerFor(wrapper, 'avatar')!;
    expect(avatar.find('[data-test="text-editor-title"]').text()).toBe(
      'BINARY - 4 bytes'
    );
    expect(viewerText(avatar)).toBe('0x89504e47');

    const payload = viewerFor(wrapper, 'payload')!;
    expect(viewerText(payload)).toBe('Xin chào');
  });

  it('is read-only: no Set NULL / Cancel / Oke and a readonly textarea', async () => {
    const wrapper = mountPreview({ id: 1, avatar: utf8('a'), payload: null });
    await flushPromises();

    const avatar = viewerFor(wrapper, 'avatar')!;
    expect(avatar.find('[data-test="text-editor-confirm"]').exists()).toBe(
      false
    );
    expect(avatar.find('[data-test="text-editor-set-null"]').exists()).toBe(
      false
    );
    expect(
      avatar.find('[data-test="text-editor-input"]').attributes('readonly')
    ).toBeDefined();
  });

  it('still lets the user switch views of the bytes', async () => {
    const wrapper = mountPreview({ id: 1, avatar: utf8('hi'), payload: null });
    await flushPromises();

    const avatar = viewerFor(wrapper, 'avatar')!;
    await avatar
      .find('[data-test="text-editor-encoding-hex"]')
      .trigger('click');

    expect(viewerText(avatar)).toBe('0x6869');
  });

  it('shows NULL binary fields as BINARY - NULL', async () => {
    const wrapper = mountPreview({ id: 1, avatar: null, payload: null });
    await flushPromises();

    const titles = wrapper
      .findAllComponents(AgTextCellEditor)
      .map(viewer => viewer.find('[data-test="text-editor-title"]').text());
    expect(titles).toEqual(['BINARY - NULL', 'BINARY - NULL']);
  });

  it('updates when another row is selected', async () => {
    const wrapper = mountPreview({ id: 1, avatar: utf8('one'), payload: null });
    await flushPromises();

    await wrapper.setProps({
      selectedRow: { id: 2, avatar: utf8('two'), payload: null },
    });
    await flushPromises();

    expect(viewerText(viewerFor(wrapper, 'avatar'))).toBe('two');
  });

  it('keeps non-binary fields as normal form inputs', async () => {
    const wrapper = mountPreview({
      id: 1,
      avatar: null,
      payload: null,
      note: 'x',
    });
    await flushPromises();

    expect(wrapper.find('textarea#note').exists()).toBe(true);
    expect(wrapper.find('textarea#avatar').exists()).toBe(false);
  });
});
