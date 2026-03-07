import catppuccinLatte from '@shikijs/themes/catppuccin-latte';
import catppuccinMocha from '@shikijs/themes/catppuccin-mocha';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine-javascript.mjs';

let highlighter: HighlighterCore | null = null;
let promise: Promise<HighlighterCore> | null = null;

const BUNDLED_LANGS = [
  import('@shikijs/langs/sql'),
  import('@shikijs/langs/plsql'),
  import('@shikijs/langs/json'),
  import('@shikijs/langs/bash'),
  import('@shikijs/langs/markdown'),
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
  const colorMode = useColorMode();

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
              // Unknown lang — silently skip, fallback to plain text
              console.warn(`[useHighlighter] Unknown language: "${lang}"`);
            })
        )
    );
  }

  return highlighter;
};
