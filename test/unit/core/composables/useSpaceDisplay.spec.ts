// @vitest-environment happy-dom
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpaceDisplay } from '@/components/modules/settings/types';
import {
  getSpaceDisplayFontSize,
  useSpaceDisplay,
} from '@/core/composables/useSpaceDisplay';
import { useAppConfigStore } from '@/core/stores/appConfigStore';

describe('useSpaceDisplay', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Clear document head of any previous style tags
    const el = document.getElementById('ag-grid-space-display-override');
    if (el) el.remove();
    document.documentElement.style.fontSize = '';
  });

  it('injects style tag and sets root font-size for Compact mode', () => {
    const store = useAppConfigStore();
    store.spaceDisplay = SpaceDisplay.Compact;

    useSpaceDisplay();

    expect(document.documentElement.style.fontSize).toBe('smaller');
    const styleEl = document.getElementById('ag-grid-space-display-override');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('.ag-header-cell-text {');
    expect(styleEl?.textContent).toContain('font-size: smaller;');
  });

  it('injects style tag and sets root font-size for Spacious mode', () => {
    const store = useAppConfigStore();
    store.spaceDisplay = SpaceDisplay.Spacious;

    useSpaceDisplay();

    expect(document.documentElement.style.fontSize).toBe('larger');
    const styleEl = document.getElementById('ag-grid-space-display-override');
    expect(styleEl).not.toBeNull();
    expect(styleEl?.textContent).toContain('font-size: larger;');
  });

  it('removes style tag and clears root font-size for Default mode', async () => {
    const store = useAppConfigStore();

    // Start with Compact to have it injected
    store.spaceDisplay = SpaceDisplay.Compact;
    useSpaceDisplay();
    expect(
      document.getElementById('ag-grid-space-display-override')
    ).not.toBeNull();

    // Change to Default
    store.spaceDisplay = SpaceDisplay.Default;
    await nextTick();

    expect(document.documentElement.style.fontSize).toBe('');
    expect(
      document.getElementById('ag-grid-space-display-override')
    ).toBeNull();
  });
});

describe('getSpaceDisplayFontSize', () => {
  it('returns "smaller" for SpaceDisplay.Compact', () => {
    expect(getSpaceDisplayFontSize(SpaceDisplay.Compact)).toBe('smaller');
  });

  it('returns "" (empty) for SpaceDisplay.Default', () => {
    expect(getSpaceDisplayFontSize(SpaceDisplay.Default)).toBe('');
  });

  it('returns "larger" for SpaceDisplay.Spacious', () => {
    expect(getSpaceDisplayFontSize(SpaceDisplay.Spacious)).toBe('larger');
  });

  it('falls back to "" for an unrecognised / corrupted value', () => {
    expect(getSpaceDisplayFontSize('invalid-value')).toBe('');
  });

  it('falls back to "" for an empty string', () => {
    expect(getSpaceDisplayFontSize('')).toBe('');
  });

  /**
   * ag-grid font-size: compact → "smaller"
   *
   * ag-grid rows and headers inherit font-size from the root <html> element.
   * When Space display is set to Compact the function must return the CSS
   * keyword "smaller" so that document.documentElement.style.fontSize = "smaller"
   * causes all rem-relative and inheriting elements — including ag-grid cells —
   * to scale down proportionally relative to the browser default.
   */
  it('applies "smaller" font-size keyword to document.documentElement for Compact (ag-grid global scale)', () => {
    // Simulate what useSpaceDisplay does in the browser
    const el = {
      style: { fontSize: '' },
    } as unknown as HTMLElement;

    el.style.fontSize = getSpaceDisplayFontSize(SpaceDisplay.Compact);

    expect(el.style.fontSize).toBe('smaller');
  });

  it('applies "larger" font-size keyword to document.documentElement for Spacious (ag-grid global scale)', () => {
    const el = { style: { fontSize: '' } } as unknown as HTMLElement;

    el.style.fontSize = getSpaceDisplayFontSize(SpaceDisplay.Spacious);

    expect(el.style.fontSize).toBe('larger');
  });

  it('clears font-size on document.documentElement for Default (restores ag-grid baseline)', () => {
    const el = { style: { fontSize: 'smaller' } } as unknown as HTMLElement;

    el.style.fontSize = getSpaceDisplayFontSize(SpaceDisplay.Default);

    expect(el.style.fontSize).toBe('');
  });
});
