# Command Palette Architecture

The Command Palette is built as a self-contained, modular feature adhering to the OrcaQ architecture guidelines.

## Directory Structure

```text
/components/modules/command-palette/
  ├── components/          # Reusable UI components strictly internal to the module (Input, Guide, etc.)
  ├── hooks/               # State management, Command Engine hook, and command providers
  ├── services/            # Core registry pattern logic
  ├── types/               # TypeScript interfaces and signatures specific to commands
  ├── views/               # The top-level parent `CommandPaletteView.vue` composing the UI
  ├── docs/                # Technical documentation
  └── index.ts             # Strict public API boundary
```

## Key Architectural Principles

1. **Strict Public API (`index.ts`)**: No external file is allowed to perform deep imports into this module. Everything intended for public consumption (e.g. `useCommandPalette`, `CommandPaletteView`) is exported via `index.ts`.
2. **Provider Pattern**: Instead of tightly coupling hard-coded arrays of items, the engine queries an extensible `CommandRegistry` class. Features plug themselves in by creating `useXCommands()` (a **Provider**).
3. **Decoupled Engine from UI**: The fuzzy searching logic (`useCommandEngine`) does not care about DOM virtualizers or `reka-ui` elements. It is strictly a computation layer relying on Vue `computed` properties and `fuse.js`.
4. **Virtualization Strategy**: To perform seamlessly against thousands of items, we flatten the provider's `groupedResults` (`Map<string, CommandItem[]>`) into a 1D array of union types (`{ type: 'header' } | { type: 'item' }`). This fuels `@tanstack/vue-virtual` for absolute CSS translation rendering.
