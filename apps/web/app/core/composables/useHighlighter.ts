import catppuccinLatte from '@shikijs/themes/catppuccin-latte';
import catppuccinMocha from '@shikijs/themes/catppuccin-mocha';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine-javascript.mjs';

let highlighter: HighlighterCore | null = null;
let promise: Promise<HighlighterCore> | null = null;

/**
 * Languages that failed to load at runtime.
 * Populated by {@link useHighlighter} when `loadLanguage()` rejects.
 */
const failedLangs = new Set<string>();

/**
 * Returns the language identifier that is safe to pass to the highlighter.
 *
 * If `lang` could not be loaded (network error, unknown grammar, etc.) this
 * returns `'text'` so callers always get plain-text rendering instead of an
 * unhandled Shiki error.
 *
 * @example
 * const hl  = await useHighlighter([lang]);
 * const out = hl.codeToHtml(code, { lang: getEffectiveLang(lang), theme: '...' });
 */
export function getEffectiveLang(lang: string): string {
  return failedLangs.has(lang) ? 'text' : lang;
}

const BUNDLED_LANGS = [
  import('@shikijs/langs/sql'),
  import('@shikijs/langs/plsql'),
  import('@shikijs/langs/json'),
  import('@shikijs/langs/bash'),
  import('@shikijs/langs/markdown'),
  import('@shikijs/langs/csv'),
  import('@shikijs/langs/xml'),
  import('@shikijs/langs/yaml'),
  import('@shikijs/langs/html'),
  // JavaScript and TypeScript must be bundled upfront — dynamic string-based
  // loadLanguage() does not work with createHighlighterCore (no bundled registry).
  import('@shikijs/langs/javascript'),
  import('@shikijs/langs/typescript'),
];

/**
 * Singleton Shiki highlighter.
 * - Core + JS regex engine (no WASM, lighter bundle)
 * - Lazy-loads unknown languages on demand via `extraLangs`
 *
 * @example
 * // Basic usage
 * const hl = await useHighlighter();
 *
 * // With extra langs (e.g. from AI stream)
 * const hl = await useHighlighter(['yaml', 'graphql']);
 */
export const useHighlighter = async (
  extraLangs?: string[]
): Promise<HighlighterCore> => {
  if (!promise) {
    promise = createHighlighterCore({
      langs: BUNDLED_LANGS,
      themes: [catppuccinLatte, catppuccinMocha],
      engine: createJavaScriptRegexEngine(),
    });
  }

  if (!highlighter) {
    highlighter = await promise;
  }

  // Lazy-load any extra languages not yet registered
  if (extraLangs?.length) {
    const loaded = highlighter.getLoadedLanguages();
    await Promise.all(
      extraLangs
        .filter(lang => !loaded.includes(lang))
        .map(lang =>
          highlighter!
            .loadLanguage(
              lang as Parameters<HighlighterCore['loadLanguage']>[0]
            )
            .catch(() => {
              // Track the failure so getEffectiveLang() can return 'text' as fallback
              failedLangs.add(lang);
              console.warn(
                `[useHighlighter] Unknown language: "${lang}" — will render as plain text`
              );
            })
        )
    );
  }

  return highlighter;
};
