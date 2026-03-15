import {
  colorSchemeDark,
  colorSchemeLight,
  themeBalham,
} from 'ag-grid-community';

const baseParams = {
  borderRadius: 'var(--radius-sm)',
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
  backgroundColor: 'var(--background)',
  foregroundColor: 'var(--foreground)',
  borderColor: 'var(--border)',
  textColor: 'var(--foreground)',
};

export const baseTableThemeLight = themeBalham
  .withPart(colorSchemeLight)
  .withParams({
    ...baseParams,
    headerTextColor: 'var(--muted-foreground)',
  });

export const baseTableThemeDark = themeBalham
  .withPart(colorSchemeDark)
  .withParams({
    ...baseParams,
    headerTextColor: 'var(--primary)',
  });

// Legacy export — kept for backwards compat; resolves to light theme at import time.
// Prefer useTableTheme() composable for reactive dark/light switching.
export const baseTableTheme = baseTableThemeLight;
