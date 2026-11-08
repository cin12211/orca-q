# Accessibility & Keyboard Navigation (A11y)

The Command Palette was built with accessibility as a primary concern, ensuring power users, keyboard navigators, and screen readers can interact seamlessly.

## 1. Keyboard Shortcuts (Hotkeys)

We use `useHotkeys` (or similar composables) to provide global triggers for the Command Palette:

- **`CMD/CTRL + K`**: Toggles the Command Palette directly into global search mode.
- **`CMD/CTRL + P`**: Toggles the Command Palette and automatically pre-fills the `>` prefix to jump straight into "Commands" mode.

## 2. Dialog Semantics & Screen Readers

The container replaces standard DOM elements with strictly typed `<Dialog>` and `<DialogContent>` components from our Reka UI/Shadcn layer.

**Screen Reader Compatibility:**
We inject a `<DialogTitle class="sr-only">Command Palette</DialogTitle>` inside the content.

- Prevents annoying warnings (`aria-describedby` or missing titles).
- Ensures when the accessible tree parses the modal, it clearly announces "Command Palette Dialog" to the user, despite visually hiding the title.

## 3. Custom Keyboard List Navigation

To heavily optimize the custom integration of `@tanstack/vue-virtual` without sacrificing accessibility, standard DOM element focus `tabindex` mapping is bypassed in favor of a synthetic state:

- **Arrow Navigation**: We listen to global `keydown` events (ArrowDown, ArrowUp) via `useEventListener`.
- **Intelligent Skipping**: The logic inspects our 1D flattened array, safely skipping `type: 'header'` grouping labels so keyboard selection _only_ lands on actionable `CommandItem` objects.
- **Auto-Scrolling**: Using `rowVirtualizer.value.scrollToIndex(activeIndex, { align: 'auto' })`, the view visually forces the DOM to scroll and keep the actively highlighted item within the view boundary, no matter how fast the user navigates.
- **Action Execution**: Pressing `Enter` verifies the highlighted index is valid and manually executes the `handleSelectCommand()` method belonging to that provider.

## 4. Visual Focus Indicators

Instead of relying on standard CSS `:focus` (because native focus remains trapped in the `<input>` element for typing), items use semantic HTML data attributes linked to our synthetic `activeIndex`:

```html
<div :data-highlighted="activeIndex === virtualRow.index ? '' : undefined">
  <!-- content -->
</div>
```

The Tailwind classes `data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground` mimic the standard hover states perfectly, ensuring keyboard users receive the exact same visual weight as mouse hovering users.
