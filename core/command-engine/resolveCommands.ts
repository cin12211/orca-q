import type { CommandItem, ParsedInput } from './commandEngine.types';
import type { CommandRegistry } from './commandRegistry';

/**
 * Resolve commands from a parsed input against the registry.
 *
 * - If a prefix is active → delegate to the matching provider only.
 * - If no prefix + empty query → show ALL providers (default overview).
 * - If no prefix + has query → merge results from global providers only (fuzzy).
 */
export function resolveCommands(
  parsed: ParsedInput,
  registry: CommandRegistry
): CommandItem[] {
  // Prefix mode: single provider
  if (parsed.prefix) {
    const provider = registry.getProvider(parsed.prefix.key);
    if (!provider) return [];
    return provider.resolve(parsed.query);
  }

  // No prefix + empty query → show everything (default overview)
  const isEmptyQuery = !parsed.query;
  const providers = isEmptyQuery
    ? registry.getAllProviders()
    : registry.getGlobalProviders();

  const allResults: CommandItem[] = [];
  for (const provider of providers) {
    allResults.push(...provider.resolve(parsed.query));
  }

  return allResults;
}
