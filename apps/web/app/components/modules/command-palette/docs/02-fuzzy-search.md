# Fuzzy Search Engine (`useCommandEngine`)

The command palette uses a robust fuzzy searching engine powered by `fuse.js`.

## Core Logic Elements

1. **Input Parsing (`parseInput.ts`)**:

   - Analyzes raw search requests (`> restart`, `t: users`).
   - Slices out prefix strings (e.g. `t:`) from the underlying query (`users`).
   - Determines the active `CommandPrefix` resolving against `CommandRegistry.getAllPrefixes()`.

2. **Debounce Optimization**:

   - `searchQuery` relies on `@vueuse/core`'s `refDebounced(rawSearchInput, 150)`.
   - Prevents `fuse.js` instantiation and array calculations while the user is actively typing.

3. **Fuse.js Configuration**:
   The engine boosts match visibility by pre-computing initials natively (e.g. `User Management` -> `um`) and injecting it as `initials` prior to fusing.

   ```js
   {
     keys: [
       { name: 'label', weight: 2 },
       { name: 'description', weight: 1 },
       { name: 'initials', weight: 1.5 },
     ],
     threshold: 0.3,
     includeMatches: true,
   }
   ```

   _Matches are then passed down to `views/CommandPaletteView.vue` where a `highlightMatch()` internal helper wraps `<span class="font-medium text-[#3794ff] underline">` HTML around the fuzzy string chunks._

4. **Global vs Contextual Scope**:
   - If a recognized prefix is detected (e.g. `t:`), the engine queries _only_ the matching `CommandProvider`.
   - If not, the engine queries _all_ global providers simultaneously through `getGlobalProviders()`.
