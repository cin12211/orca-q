import { describe, expect, it } from 'vitest';
import {
  EditorTheme,
  resolveEditorTheme,
} from '~/components/base/code-editor/constants';

describe('resolveEditorTheme', () => {
  it('resolves tomorrow to orca-dark in dark mode', () => {
    expect(resolveEditorTheme(EditorTheme.Tomorrow, 'dark')).toBe(
      EditorTheme.OrcaDark
    );
  });

  it('keeps tomorrow in light mode', () => {
    expect(resolveEditorTheme(EditorTheme.Tomorrow, 'light')).toBe(
      EditorTheme.Tomorrow
    );
  });

  it('resolves orca-dark to orca-light in light mode', () => {
    expect(resolveEditorTheme(EditorTheme.OrcaDark, 'light')).toBe(
      EditorTheme.OrcaLight
    );
  });

  it('keeps orca-dark in dark mode', () => {
    expect(resolveEditorTheme(EditorTheme.OrcaDark, 'dark')).toBe(
      EditorTheme.OrcaDark
    );
  });

  it('preserves specific custom themes regardless of color mode', () => {
    expect(resolveEditorTheme(EditorTheme.Dracula, 'dark')).toBe(
      EditorTheme.Dracula
    );
    expect(resolveEditorTheme(EditorTheme.Dracula, 'light')).toBe(
      EditorTheme.Dracula
    );
    expect(resolveEditorTheme(EditorTheme.Barf, 'dark')).toBe(EditorTheme.Barf);
    expect(resolveEditorTheme(EditorTheme.Bespin, 'light')).toBe(
      EditorTheme.Bespin
    );
    expect(resolveEditorTheme(EditorTheme.AyuDark, 'dark')).toBe(
      EditorTheme.AyuDark
    );
    expect(resolveEditorTheme(EditorTheme.AyuLight, 'light')).toBe(
      EditorTheme.AyuLight
    );
    expect(resolveEditorTheme(EditorTheme.NoctisLilac, 'light')).toBe(
      EditorTheme.NoctisLilac
    );
    expect(resolveEditorTheme(EditorTheme.RosePineDawn, 'dark')).toBe(
      EditorTheme.RosePineDawn
    );
  });
});
