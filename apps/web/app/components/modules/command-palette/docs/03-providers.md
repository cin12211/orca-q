# Command Providers API

Providers inject groups of search items into the engine. The architecture ensures logic is highly modular—each domain creates a file like `hooks/providers/useFileCommands.ts`.

## `CommandProvider` Signature

```ts
export interface CommandProvider {
  /** The prefix and metadata triggering this provider */
  prefix: CommandPrefix;
  /**
   * Resolves the list of CommandItems based on the active query.
   * Return an empty array or all instances initially, then let `useCommandEngine`
   * fuzzy-search via `fuse.js`.
   */
  resolve: (query: string) => CommandItem[];
  /** Determines if these results should also appear when there is NO active prefix */
  includeInGlobal?: boolean;
}
```

## `CommandItem` Structure

```ts
export interface CommandItem {
  id: string; // Unique identifier for virtualization keys
  label: string;
  description?: string;
  group: string; // The UI group string (e.g. "Files", "Commands")
  icon?: string;
  iconClass?: string;
  execute: () => void | Promise<void>;
}
```

## Registering a New Provider

1. Create a `hooks/providers/useBrandNewFeature.ts`
2. Define the `CommandProvider` implementation resolving your domain's `CommandItem[]`.
3. Open `hooks/useCommandEngine.ts` > `createRegistry()`
4. Add it to the registry map: `registry.register(useBrandNewFeature());`
