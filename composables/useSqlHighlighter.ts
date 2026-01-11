import { ref, computed, onBeforeMount } from 'vue';
import json from '@shikijs/langs/json';
import plsql from '@shikijs/langs/plsql';
import catppuccinLatte from '@shikijs/themes/catppuccin-latte';
import catppuccinMocha from '@shikijs/themes/catppuccin-mocha';
import {
  createHighlighterCore,
  createJavaScriptRegexEngine,
  type HighlighterCore,
} from 'shiki';

// Light theme for light mode, dark theme for dark mode
const LIGHT_THEME = 'catppuccin-latte';
const DARK_THEME = 'catppuccin-mocha';

// Supported languages
export type SupportedLanguage = 'sql' | 'json';

// Map our language names to Shiki language IDs
const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  sql: 'plsql',
  json: 'json',
  //   javascript: 'javascript',
  //   typescript: 'typescript',
};

/**
 * Composable for syntax highlighting using Shiki.
 * Supports multiple languages and light/dark mode automatically.
 *
 * @example
 * ```ts
 * const { highlight, highlighter, currentTheme } = useCodeHighlighter();
 *
 * // Highlight SQL
 * const sqlHtml = highlight('SELECT * FROM users', 'sql');
 *
 * // Highlight JSON
 * const jsonHtml = highlight('{"key": "value"}', 'json');
 *
 * // Highlight JavaScript
 * const jsHtml = highlight('const x = 1;', 'javascript');
 * ```
 */
export function useCodeHighlighter() {
  const colorMode = useColorMode();
  const highlighter = ref<HighlighterCore>();
  const isLoading = ref(true);

  // Determine current theme based on color mode
  const currentTheme = computed(() => {
    return colorMode.value === 'dark' ? DARK_THEME : LIGHT_THEME;
  });

  // Initialize highlighter on component mount
  onBeforeMount(async () => {
    try {
      const highlighterInstance = await createHighlighterCore({
        themes: [catppuccinLatte, catppuccinMocha],
        langs: [plsql, json],
        engine: createJavaScriptRegexEngine(),
      });

      highlighter.value = highlighterInstance;
    } catch (error) {
      console.error('Failed to initialize code highlighter:', error);
    } finally {
      isLoading.value = false;
    }
  });

  /**
   * Highlight code and return HTML string
   * @param code - Code to highlight
   * @param language - Language for syntax highlighting
   * @returns Highlighted HTML string
   */
  const highlight = (
    code: string,
    language: SupportedLanguage = 'sql'
  ): string => {
    if (!highlighter.value || !code) {
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }

    const lang = LANGUAGE_MAP[language] || 'plsql';

    return highlighter.value.codeToHtml(code, {
      lang,
      theme: currentTheme.value,
    });
  };

  /**
   * Highlight code and return tokens for custom rendering
   * @param code - Code to highlight
   * @param language - Language for syntax highlighting
   * @returns Array of token lines
   */
  const highlightTokens = (
    code: string,
    language: SupportedLanguage = 'sql'
  ) => {
    if (!highlighter.value || !code) {
      return [];
    }

    const lang = LANGUAGE_MAP[language] || 'plsql';

    return highlighter.value.codeToTokens(code, {
      lang,
      theme: currentTheme.value,
    });
  };

  // Convenience methods for specific languages
  const highlightSql = (code: string) => highlight(code, 'sql');
  const highlightJson = (code: string) => highlight(code, 'json');
  //   const highlightJs = (code: string) => highlight(code, 'javascript');
  //   const highlightTs = (code: string) => highlight(code, 'typescript');

  return {
    /** The Shiki highlighter instance */
    highlighter,
    /** Whether the highlighter is still loading */
    isLoading,
    /** Current theme name based on color mode */
    currentTheme,
    /** Generic highlight function - specify language */
    highlight,
    /** Highlight code and return tokens */
    highlightTokens,
    /** Convenience: Highlight SQL code */
    highlightSql,
    /** Convenience: Highlight JSON code */
    highlightJson,
    /** Convenience: Highlight JavaScript code */
    // highlightJs,
    /** Convenience: Highlight TypeScript code */
    // highlightTs,
  };
}

// Helper to escape HTML entities
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
