import { describe, expect, it } from 'vitest';
import {
  getTabViewMinWidth,
  TAURI_MAC_TITLEBAR_INSET,
} from '@/components/modules/app-shell/tab-view-container/tabViewContainerLayout';

describe('getTabViewMinWidth', () => {
  it('returns collapsed width when the sidebar is hidden', () => {
    expect(
      getTabViewMinWidth({
        primarySideBarWidth: 320,
        sidebarWidthPercentage: 0,
        isTauriMacWindow: false,
      })
    ).toBe('2.25rem');
  });

  it('keeps the existing web width calculation unchanged', () => {
    expect(
      getTabViewMinWidth({
        primarySideBarWidth: 320,
        sidebarWidthPercentage: 30,
        isTauriMacWindow: false,
      })
    ).toBe('320px');
  });

  it('subtracts the macOS titlebar inset only for Tauri windows', () => {
    expect(
      getTabViewMinWidth({
        primarySideBarWidth: 320,
        sidebarWidthPercentage: 30,
        isTauriMacWindow: true,
      })
    ).toBe(`max(2.25rem, calc(320px - ${TAURI_MAC_TITLEBAR_INSET}))`);
  });
});
