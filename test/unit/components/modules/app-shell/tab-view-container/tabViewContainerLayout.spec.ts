import { describe, expect, it } from 'vitest';
import {
  getTabViewMinWidth,
  DESKTOP_MAC_TITLEBAR_INSET,
} from '@/components/modules/app-shell/tab-view-container/tabViewContainerLayout';

describe('getTabViewMinWidth', () => {
  it('returns collapsed width when the sidebar is hidden', () => {
    expect(
      getTabViewMinWidth({
        primarySideBarWidth: 320,
        sidebarWidthPercentage: 0,
        isDesktopMacWindow: false,
      })
    ).toBe('2.25rem');
  });

  it('keeps the existing web width calculation unchanged', () => {
    expect(
      getTabViewMinWidth({
        primarySideBarWidth: 320,
        sidebarWidthPercentage: 30,
        isDesktopMacWindow: false,
      })
    ).toBe('320px');
  });

  it('subtracts the macOS titlebar inset for desktop Mac windows', () => {
    expect(
      getTabViewMinWidth({
        primarySideBarWidth: 320,
        sidebarWidthPercentage: 30,
        isDesktopMacWindow: true,
      })
    ).toBe(`max(2.25rem, calc(320px - ${DESKTOP_MAC_TITLEBAR_INSET}))`);
  });
});
