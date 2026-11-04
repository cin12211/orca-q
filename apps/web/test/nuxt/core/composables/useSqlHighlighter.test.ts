import { describe, expect, it, vi } from 'vitest';
import { useCodeHighlighter } from '~/core/composables/useSqlHighlighter';

describe('useCodeHighlighter', () => {
  it('starts in loading state before lifecycle initialization', () => {
    const { isLoading } = useCodeHighlighter();
    expect(isLoading.value).toBe(true);
  });

  it('provides a valid current theme value', () => {
    const { currentTheme } = useCodeHighlighter();

    expect(['catppuccin-latte', 'catppuccin-mocha']).toContain(
      currentTheme.value
    );
  });

  it('returns escaped fallback HTML when highlighter is not ready', () => {
    const { highlight } = useCodeHighlighter();

    const html = highlight('<script>alert(1)</script>', 'sql');

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('returns fallback HTML for empty input', () => {
    const { highlight } = useCodeHighlighter();

    const html = highlight('', 'sql');

    expect(html).toBe('<pre><code></code></pre>');
  });

  it('returns empty tokens when highlighter is missing', () => {
    const { highlightTokens } = useCodeHighlighter();

    const tokens = highlightTokens('SELECT * FROM users', 'sql');

    expect(tokens).toEqual([]);
  });

  it('uses highlighter codeToHtml with SQL language mapping', () => {
    const { highlighter, highlight } = useCodeHighlighter();
    const codeToHtml = vi.fn().mockReturnValue('<pre>sql</pre>');

    highlighter.value = {
      codeToHtml,
      codeToTokens: vi.fn(),
    } as any;

    const result = highlight('SELECT 1', 'sql');

    expect(result).toBe('<pre>sql</pre>');
    expect(codeToHtml).toHaveBeenCalledWith(
      'SELECT 1',
      expect.objectContaining({ lang: 'plsql' })
    );
  });

  it('uses highlighter codeToHtml with JSON language mapping', () => {
    const { highlighter, highlightJson } = useCodeHighlighter();
    const codeToHtml = vi.fn().mockReturnValue('<pre>json</pre>');

    highlighter.value = {
      codeToHtml,
      codeToTokens: vi.fn(),
    } as any;

    const result = highlightJson('{"ok":true}');

    expect(result).toBe('<pre>json</pre>');
    expect(codeToHtml).toHaveBeenCalledWith(
      '{"ok":true}',
      expect.objectContaining({ lang: 'json' })
    );
  });

  it('uses codeToTokens when highlighter is ready', () => {
    const { highlighter, highlightTokens } = useCodeHighlighter();
    const tokenResult = [[{ content: 'SELECT' }]];
    const codeToTokens = vi.fn().mockReturnValue(tokenResult);

    highlighter.value = {
      codeToHtml: vi.fn(),
      codeToTokens,
    } as any;

    const result = highlightTokens('SELECT 1', 'sql');

    expect(result).toBe(tokenResult);
    expect(codeToTokens).toHaveBeenCalledWith(
      'SELECT 1',
      expect.objectContaining({ lang: 'plsql' })
    );
  });

  it('highlightSql delegates to generic highlight', () => {
    const { highlighter, highlightSql } = useCodeHighlighter();
    const codeToHtml = vi.fn().mockReturnValue('<pre>delegated</pre>');

    highlighter.value = {
      codeToHtml,
      codeToTokens: vi.fn(),
    } as any;

    const result = highlightSql('SELECT now()');

    expect(result).toBe('<pre>delegated</pre>');
    expect(codeToHtml).toHaveBeenCalled();
  });
});
