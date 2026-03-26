import { describe, expect, it, vi } from 'vitest';
import { useContextMenuState } from '~/components/modules/management/schemas/hooks/context-menu/useContextMenuState';
import { TabViewType } from '~/core/stores/useTabViewsStore';

describe('useContextMenuState', () => {
  it('initializes all state to correct defaults', () => {
    const state = useContextMenuState();

    expect(state.selectedItem.value).toBeNull();

    expect(state.safeModeDialogOpen.value).toBe(false);
    expect(state.safeModeDialogSQL.value).toBe('');
    expect(state.safeModeDialogType.value).toBe('delete');
    expect(state.pendingAction.value).toBeNull();

    expect(state.renameDialogOpen.value).toBe(false);
    expect(state.renameDialogType.value).toBeNull();
    expect(state.renameDialogValue.value).toBe('');
    expect(state.renameDialogParameters.value).toBe('');

    expect(state.sqlPreviewDialogOpen.value).toBe(false);
    expect(state.sqlPreviewDialogSQL.value).toBe('');
    expect(state.sqlPreviewDialogTitle.value).toBe('Generated SQL');

    expect(state.isFetching.value).toBe(false);
  });

  it('state refs are independently reactive', () => {
    const state = useContextMenuState();

    state.safeModeDialogOpen.value = true;
    state.isFetching.value = true;
    state.renameDialogType.value = TabViewType.TableDetail;

    expect(state.safeModeDialogOpen.value).toBe(true);
    expect(state.isFetching.value).toBe(true);
    expect(state.renameDialogType.value).toBe(TabViewType.TableDetail);

    // Changing one doesn't affect another
    state.safeModeDialogOpen.value = false;
    expect(state.isFetching.value).toBe(true);
  });

  it('pendingAction can store and invoke a function', async () => {
    const state = useContextMenuState();
    const mockAction = vi.fn().mockResolvedValue(undefined);

    state.pendingAction.value = mockAction;
    await state.pendingAction.value?.();

    expect(mockAction).toHaveBeenCalledOnce();
  });

  it('multiple state instances are isolated', () => {
    const stateA = useContextMenuState();
    const stateB = useContextMenuState();

    stateA.safeModeDialogOpen.value = true;

    expect(stateB.safeModeDialogOpen.value).toBe(false);
  });
});
