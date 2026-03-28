export const TAURI_MAC_TITLEBAR_INSET = '4.75rem';

type GetTabViewMinWidthParams = {
  primarySideBarWidth: number;
  sidebarWidthPercentage: number | undefined;
  isTauriMacWindow: boolean;
};

export function getTabViewMinWidth({
  primarySideBarWidth,
  sidebarWidthPercentage,
  isTauriMacWindow,
}: GetTabViewMinWidthParams): string {
  if (!sidebarWidthPercentage) {
    return '2.25rem';
  }

  if (isTauriMacWindow) {
    return `max(2.25rem, calc(${primarySideBarWidth}px - ${TAURI_MAC_TITLEBAR_INSET}))`;
  }

  return `${primarySideBarWidth}px`;
}
