import { computed, ref } from 'vue';
import type { CommandItem, CommandPrefix } from './commandEngine.types';
import { CommandRegistry } from './commandRegistry';
import { parseInput } from './parseInput';
import { useErdCommands } from './providers/useErdCommands';
import { useFileCommands } from './providers/useFileCommands';
import { useFunctionCommands } from './providers/useFunctionCommands';
import { useSystemCommands } from './providers/useSystemCommands';
import { useTabCommands } from './providers/useTabCommands';
import { useTableCommands } from './providers/useTableCommands';
import { useViewCommands } from './providers/useViewCommands';
import { resolveCommands } from './resolveCommands';

/**
 * Build and populate the command registry with all providers.
 * Called once per composable instance (i.e. once per app lifetime).
 */
function createRegistry(): CommandRegistry {
  const registry = new CommandRegistry();

  // Registration order determines default display order
  registry.register(useTabCommands()); // Open Tabs
  registry.register(useFileCommands()); // Files
  registry.register(useTableCommands()); // Tables
  registry.register(useViewCommands()); // Views
  registry.register(useFunctionCommands()); // Functions
  registry.register(useErdCommands()); // ERD
  registry.register(useSystemCommands()); // Commands (Settings, Reload, etc.)

  return registry;
}

export function useCommandEngine() {
  const registry = createRegistry();
  const searchInput = ref('');

  const parsed = computed(() =>
    parseInput(searchInput.value, registry.getAllPrefixes())
  );

  const results = computed(() => resolveCommands(parsed.value, registry));

  const activePrefix = computed<CommandPrefix | null>(
    () => parsed.value.prefix
  );

  const placeholder = computed(
    () => activePrefix.value?.placeholder ?? 'Type a command or search...'
  );

  /** Group results by their group label for rendering */
  const groupedResults = computed(() => {
    const groups = new Map<string, CommandItem[]>();

    for (const item of results.value) {
      const existing = groups.get(item.group);
      if (existing) {
        existing.push(item);
      } else {
        groups.set(item.group, [item]);
      }
    }

    return groups;
  });

  const resetSearch = () => {
    searchInput.value = '';
  };

  return {
    searchInput,
    results,
    groupedResults,
    activePrefix,
    placeholder,
    resetSearch,
  };
}
