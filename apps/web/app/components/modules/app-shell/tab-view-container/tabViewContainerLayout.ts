export const DESKTOP_MAC_TITLEBAR_INSET = '4.75rem';

type GetTabViewMinWidthParams = {
  primarySideBarWidth: number;
  sidebarWidthPercentage: number | undefined;
  isDesktopMacWindow: boolean;
};

export function getTabViewMinWidth({
  primarySideBarWidth,
  sidebarWidthPercentage,
  isDesktopMacWindow,
}: GetTabViewMinWidthParams): string {
  if (!sidebarWidthPercentage) {
    return '2.25rem';
  }

  if (isDesktopMacWindow) {
    return `max(2.25rem, calc(${primarySideBarWidth}px - ${DESKTOP_MAC_TITLEBAR_INSET}))`;
  }

  return `${primarySideBarWidth}px`;
}
