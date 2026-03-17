import { watch } from 'vue';
import { SpaceDisplay } from '~/components/modules/settings/types';
import { useAppConfigStore } from '~/core/stores/appConfigStore';

const VALID_VALUES = new Set<string>(Object.values(SpaceDisplay));

/**
 * Maps a SpaceDisplay preference to the CSS font-size value that is applied
 * to `document.documentElement`. All descendant text — including ag-grid cells
 * that inherit from the root — scales proportionally.
 *
 *   compact  → 'smaller'  (CSS relative keyword — smaller than the inherited size)
 *   default  → ''         (empty string removes any override, restoring browser default)
 *   spacious → 'larger'   (CSS relative keyword — larger than the inherited size)
 */
export function getSpaceDisplayFontSize(value: SpaceDisplay | string): string {
  const safe = VALID_VALUES.has(value) ? value : SpaceDisplay.Default;
  if (safe === SpaceDisplay.Compact) return 'smaller';
  if (safe === SpaceDisplay.Spacious) return 'larger';
  return '';
}

/**
 * Composable that watches the persisted spaceDisplay preference and applies
 * the corresponding font-size to <html>. Call once in app.vue.
 */
export function useSpaceDisplay() {
  const appConfigStore = useAppConfigStore();

  const apply = (value: SpaceDisplay) => {
    if (typeof document === 'undefined') return;
    const fontSize = getSpaceDisplayFontSize(value);

    // 1. Apply global root scale
    document.documentElement.style.fontSize = fontSize;

    // 2. Apply specific ag-grid overrides
    // ag-grid (with themes like Balham) can have internal font-size rules
    // that don't always inherit from the root.
    const styleId = 'ag-grid-space-display-override';
    let styleEl = document.getElementById(styleId);

    if (fontSize) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        .ag-header-cell-text {
          font-size: ${fontSize};
        }
        .ag-cell {
          font-size: ${fontSize};
        }
      `;
    } else if (styleEl) {
      styleEl.remove();
    }
  };

  // Apply immediately on mount, then reactively on change
  watch(() => appConfigStore.spaceDisplay, apply, { immediate: true });
}
