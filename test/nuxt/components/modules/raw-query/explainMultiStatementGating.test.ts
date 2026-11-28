import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as codeEditorUtils from '~/components/base/code-editor/utils';
import RawQueryEditorFooter from '~/components/modules/raw-query/components/RawQueryEditorFooter.vue';
import { useRawQueryEditorContextMenu } from '~/components/modules/raw-query/hooks/useRawQueryEditorContextMenu';

vi.mock('~/components/base/code-editor/utils', () => ({
  getCurrentStatement: vi.fn(),
}));

const statement = (text: string, from: number) => ({
  text,
  from,
  to: from + text.length,
  type: 'Statement',
});

describe('EXPLAIN with a multi-statement selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMenu = () => {
    const view = { state: { doc: { length: 20 } } } as any;
    return useRawQueryEditorContextMenu({
      onExecuteCurrent: vi.fn(),
      onExplainAnalyzeCurrent: vi.fn(),
      onHandleFormatCurrentStatement: vi.fn(),
      onHandleFormatCode: vi.fn(),
      isExplainSupported: ref(true),
      getEditorView: () => view,
    });
  };

  const findItem = (
    items: ReturnType<typeof setupMenu>['contextMenuItems']['value'],
    title: string
  ) => items.find(item => 'title' in item && item.title === title) as any;

  it('disables "Analyze Query" but keeps "Execute" in the editor context menu', () => {
    vi.mocked(codeEditorUtils.getCurrentStatement).mockReturnValue({
      currentStatements: [
        statement('SELECT 1;', 0),
        statement('SELECT 2;', 10),
      ],
    });
    const { contextMenuItems, onContextMenuOpen } = setupMenu();

    onContextMenuOpen(true);

    expect(findItem(contextMenuItems.value, 'Analyze Query').disabled).toBe(
      true
    );
    expect(findItem(contextMenuItems.value, 'Execute').disabled).toBe(false);
  });

  it('keeps "Analyze Query" enabled for a single statement', () => {
    vi.mocked(codeEditorUtils.getCurrentStatement).mockReturnValue({
      currentStatements: [statement('SELECT 1;', 0)],
    });
    const { contextMenuItems, onContextMenuOpen } = setupMenu();

    onContextMenuOpen(true);

    expect(findItem(contextMenuItems.value, 'Analyze Query').disabled).toBe(
      false
    );
  });

  it('disables the footer Explain button and explains why', () => {
    const wrapper = mount(RawQueryEditorFooter, {
      props: {
        cursorInfo: { line: 1, column: 1 },
        executeLoading: false,
        isStreaming: false,
        explainAnalyzeOptionItems: [],
        serializeMode: 'NONE',
        isExplainSupported: true,
        isExplainDisabled: true,
      },
      global: {
        stubs: {
          Icon: true,
          RawQueryVariableUsageGuidePopover: true,
          Tooltip: { template: '<div><slot /></div>' },
          TooltipTrigger: { template: '<div><slot /></div>' },
          TooltipContent: { template: '<div><slot /></div>' },
          DropdownMenu: { template: '<div><slot /></div>' },
          DropdownMenuTrigger: { template: '<div><slot /></div>' },
          DropdownMenuContent: true,
        },
      },
    });

    expect(
      wrapper
        .get('[data-testid="raw-query-explain-button"]')
        .attributes('disabled')
    ).toBeDefined();
    expect(wrapper.text()).toContain(
      'Explain works on a single statement. Select one statement.'
    );
  });

  describe('selected statement count in the footer', () => {
    const mountFooter = (selectedStatementCount: number) =>
      mount(RawQueryEditorFooter, {
        props: {
          cursorInfo: { line: 1, column: 1 },
          executeLoading: false,
          isStreaming: false,
          explainAnalyzeOptionItems: [],
          serializeMode: 'NONE',
          selectedStatementCount,
        },
        global: {
          stubs: {
            Icon: true,
            RawQueryVariableUsageGuidePopover: true,
            Tooltip: { template: '<div><slot /></div>' },
            TooltipTrigger: { template: '<div><slot /></div>' },
            TooltipContent: { template: '<div><slot /></div>' },
          },
        },
      });

    it('shows how many statements are selected and what Execute will run', () => {
      const wrapper = mountFooter(3);

      expect(
        wrapper.get('[data-testid="raw-query-selected-statement-count"]').text()
      ).toBe('· 3 statements selected');
      expect(
        wrapper.get('[data-testid="raw-query-execute-button"]').text()
      ).toContain('Execute 3 statements');
    });

    it.each([0, 1])('keeps the single-statement footer for %i', count => {
      const wrapper = mountFooter(count);

      expect(
        wrapper
          .find('[data-testid="raw-query-selected-statement-count"]')
          .exists()
      ).toBe(false);
      expect(
        wrapper.get('[data-testid="raw-query-execute-button"]').text()
      ).toContain('Execute current');
    });
  });
});
