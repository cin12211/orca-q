import { refDebounced } from '@vueuse/core';
import { computed, ref } from 'vue';
import Fuse from 'fuse.js';
import { CommandRegistry } from '../services/commandRegistry';
import type { CommandItem, CommandPrefix } from '../types/commandEngine.types';
import { parseInput } from './parseInput';
import { useErdCommands } from './providers/useErdCommands';
import { useFileCommands } from './providers/useFileCommands';
import { useFunctionCommands } from './providers/useFunctionCommands';
import { useSystemCommands } from './providers/useSystemCommands';
import { useTabCommands } from './providers/useTabCommands';
import { useTableCommands } from './providers/useTableCommands';
import { useViewCommands } from './providers/useViewCommands';

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

/** Helper to generate initials for CamelCase and multi-word searches */
function getInitials(text: string) {
  if (!text) return '';
  const words = text.split(/[\s_-]+/);
  let initials = '';
  for (const word of words) {
    if (!word) continue;
    initials += word[0].toLowerCase();
    for (let i = 1; i < word.length; i++) {
      if (word[i] >= 'A' && word[i] <= 'Z') {
        initials += word[i].toLowerCase();
      }
    }
  }
  return initials;
}

export function useCommandEngine() {
  const registry = createRegistry();
  const searchInput = ref('');

  const parsed = computed(() =>
    parseInput(searchInput.value, registry.getAllPrefixes())
  );

  const debouncedQuery = refDebounced(
    computed(() => parsed.value.query),
    150
  );

  const activePrefix = computed<CommandPrefix | null>(
    () => parsed.value.prefix
  );

  const placeholder = computed(
    () => activePrefix.value?.placeholder ?? 'Type a command or search...'
  );

  const searchableItems = computed<CommandItem[]>(() => {
    let items: CommandItem[] = [];
    if (activePrefix.value) {
      const provider = registry.getProvider(activePrefix.value.key);
      if (provider) {
        items = provider.resolve('');
      }
    } else {
      const providers = registry.getGlobalProviders();
      for (const provider of providers) {
        items.push(...provider.resolve(''));
      }
    }

    return items.map(item => ({
      ...item,
      initials:
        getInitials(item.label) +
        (item.description ? getInitials(item.description) : ''),
    }));
  });

  const fuse = computed(() => {
    const index = Fuse.createIndex(
      ['label', 'description', 'initials'],
      searchableItems.value
    );
    return new Fuse(
      searchableItems.value,
      {
        keys: [
          { name: 'label', weight: 2 },
          { name: 'description', weight: 1 },
          { name: 'initials', weight: 1.5 },
        ],
        threshold: 0.3,
        includeMatches: true,
        useExtendedSearch: true,
        ignoreLocation: true,
      },
      index
    );
  });

  const results = computed<CommandItem[]>(() => {
    const query = debouncedQuery.value.trim();

    // Empty query -> Show all items organized by provider
    if (!query) {
      if (activePrefix.value) {
        return searchableItems.value;
      }

      const providers = registry.getAllProviders();
      const all: CommandItem[] = [];
      for (const provider of providers) {
        all.push(...provider.resolve(''));
      }
      return all;
    }

    // Perform fuzzy search
    const fuseResults = fuse.value.search(query);
    return fuseResults.map(result => ({
      ...result.item,
      matches: result.matches,
    }));
  });

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
