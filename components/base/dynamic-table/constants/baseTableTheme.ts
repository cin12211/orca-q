import { themeBalham } from 'ag-grid-community';

export const baseTableTheme = themeBalham.withParams({
  backgroundColor: 'var(--background)',
  // wrapperBorderRadius: 0,
  // accentColor: 'var(--color-gray-900)',
  borderRadius: 'var(--radius-sm)',
  borderColor: 'var(--input)',
  wrapperBorderRadius: 'var(--radius)',
  checkboxBorderRadius: 5,
  checkboxCheckedBackgroundColor: 'var(--foreground)',
  checkboxCheckedShapeColor: 'var(--background)',
  checkboxCheckedBorderColor: 'transparent',
  headerFontWeight: 700,
  columnBorder: true,
  headerRowBorder: true,
  rowBorder: false,
  sidePanelBorder: false,
  wrapperBorder: false,
  spacing: 2.8,
  headerVerticalPaddingScale: 1.25,
});
