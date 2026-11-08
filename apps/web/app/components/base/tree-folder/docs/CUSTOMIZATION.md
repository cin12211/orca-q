# Tree Component Customization Guide

The tree component is **fully customizable** using CSS variables, following the **Headless UI** pattern. This means you have complete control over every visual aspect—colors, sizes, spacing, typography, animations, and effects—without touching the component source code.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Complete CSS Variables Reference](#complete-css-variables-reference)
  - [FileTree Container](#filetree-container)
  - [Scrollbar](#scrollbar)
  - [TreeRow Colors](#treerow-colors)
  - [TreeRow Dimensions](#treerow-dimensions)
  - [TreeRow Focus Ring](#treerow-focus-ring)
  - [Drag & Drop Indicators](#drag--drop-indicators)
  - [Chevron (Toggle)](#chevron-toggle)
  - [Icon](#icon)
  - [Typography](#typography)
  - [Input Field (Rename/Edit)](#input-field-renameedit)
  - [Row Actions](#row-actions)
  - [Transitions & Animations](#transitions--animations)
  - [Drag Preview](#drag-preview)
- [Usage Examples](#usage-examples)
- [Pre-built Themes](#pre-built-themes)

---

## Quick Start

All CSS variables are defined in \`/assets/css/tailwind.css\` with full light/dark mode support. Override any variable in your CSS to customize the tree:

\`\`\`css
:root {
/_ Use larger font _/
--v-tree-row-font-size: 14px;

/_ Custom colors _/
--v-tree-row-hover-bg: rgba(59, 130, 246, 0.1);
--v-tree-row-selected-bg: rgba(59, 130, 246, 0.2);
}
\`\`\`

---

## Complete CSS Variables Reference

### FileTree Container

Controls the overall tree container appearance.

| Variable          | Light Mode           | Dark Mode            | Description                |
| ----------------- | -------------------- | -------------------- | -------------------------- |
| \`--v-tree-bg\`   | \`transparent\`      | \`transparent\`      | Container background color |
| \`--v-tree-text\` | \`oklch(0.145 0 0)\` | \`oklch(0.985 0 0)\` | Default text color         |

**Example:**
\`\`\`css
:root {
--v-tree-bg: rgba(255, 255, 255, 0.5);
--v-tree-text: #1a1a1a;
}
\`\`\`

---

### Scrollbar

Customize the scrollbar appearance and dimensions.

| Variable                           | Light Mode                 | Dark Mode                  | Description                 |
| ---------------------------------- | -------------------------- | -------------------------- | --------------------------- |
| \`--v-tree-scrollbar-thumb\`       | \`oklch(0.556 0 0 / 0.3)\` | \`oklch(0.708 0 0 / 0.3)\` | Scrollbar thumb color       |
| \`--v-tree-scrollbar-thumb-hover\` | \`oklch(0.556 0 0 / 0.5)\` | \`oklch(0.708 0 0 / 0.5)\` | Scrollbar thumb hover color |
| \`--v-tree-scrollbar-track\`       | \`transparent\`            | \`transparent\`            | Scrollbar track color       |

**Example:**
\`\`\`css
:root {
/_ Wider scrollbar _/

/_ Custom colors _/
--v-tree-scrollbar-thumb: rgba(100, 100, 100, 0.5);
--v-tree-scrollbar-track: rgba(200, 200, 200, 0.2);
}
\`\`\`

---

### TreeRow Colors

All color-related properties for tree rows.

| Variable                           | Light Mode                  | Dark Mode                   | Description             |
| ---------------------------------- | --------------------------- | --------------------------- | ----------------------- |
| \`--v-tree-row-hover-bg\`          | \`oklch(0.97 0 0)\`         | \`oklch(0.269 0 0)\`        | Row background on hover |
| \`--v-tree-row-selected-bg\`       | \`oklch(0.205 0 0 / 0.15)\` | \`oklch(0.985 0 0 / 0.15)\` | Selected row background |
| \`--v-tree-row-selected-hover-bg\` | \`oklch(0.205 0 0 / 0.2)\`  | \`oklch(0.985 0 0 / 0.2)\`  | Selected row on hover   |
| \`--v-tree-row-focus-ring\`        | \`oklch(0.708 0 0)\`        | \`oklch(0.439 0 0)\`        | Focus ring color        |
| \`--v-tree-row-text-color\`        | \`currentColor\`            | \`currentColor\`            | Row text color          |

**Example:**
\`\`\`css
:root {
/_ Blue theme _/
--v-tree-row-hover-bg: rgba(59, 130, 246, 0.1);
--v-tree-row-selected-bg: rgba(59, 130, 246, 0.2);
--v-tree-row-selected-hover-bg: rgba(59, 130, 246, 0.3);
--v-tree-row-focus-ring: rgb(59, 130, 246);
}
\`\`\`

---

### TreeRow Dimensions

Control the size and spacing of tree rows.

| Variable                | Default Value | Description            |
| ----------------------- | ------------- | ---------------------- |
| \`--v-tree-row-margin\` | \`0 4px\`     | Margin around each row |

**Example - Compact Size:**
\`\`\`css
:root {
--v-tree-row-margin: 0 2px;
--v-tree-row-font-size: 12px;
}
\`\`\`

**Example - Large Size:**
\`\`\`css
:root {
--v-tree-row-margin: 0 8px;
--v-tree-row-font-size: 15px;
}
\`\`\`

---

### TreeRow Focus Ring

Customize the focus indicator appearance.

| Variable                           | Default Value | Description          |
| ---------------------------------- | ------------- | -------------------- |
| \`--v-tree-row-focus-ring-width\`  | \`1px\`       | Width of focus ring  |
| \`--v-tree-row-focus-ring-offset\` | \`-1px\`      | Offset from row edge |

**Example:**
\`\`\`css
:root {
/_ Thicker, outer focus ring _/
--v-tree-row-focus-ring-width: 2px;
--v-tree-row-focus-ring-offset: 2px;
--v-tree-row-focus-ring: rgb(59, 130, 246);
}
\`\`\`

---

### Drag & Drop Indicators

Visual feedback during drag and drop operations.

| Variable                              | Light Mode                 | Dark Mode                  | Description                            |
| ------------------------------------- | -------------------------- | -------------------------- | -------------------------------------- |
| \`--v-tree-indicator-color\`          | \`oklch(0.205 0 0)\`       | \`oklch(0.985 0 0)\`       | Drop indicator line color              |
| \`--v-tree-indicator-height\`         | \`2px\`                    | \`2px\`                    | Height of drop indicator line          |
| \`--v-tree-drop-inside-bg\`           | \`oklch(0.205 0 0 / 0.1)\` | \`oklch(0.985 0 0 / 0.1)\` | Background when dropping inside folder |
| \`--v-tree-drop-inside-border-width\` | \`1px\`                    | \`1px\`                    | Border width for drop-inside indicator |

**Example:**
\`\`\`css
:root {
/_ Bright indicator _/
--v-tree-indicator-color: rgb(34, 197, 94);
--v-tree-indicator-height: 3px;
--v-tree-drop-inside-bg: rgba(34, 197, 94, 0.15);
}
\`\`\`

---

### Chevron (Toggle)

The expand/collapse arrow button.

| Variable                        | Default Value            | Description                        |
| ------------------------------- | ------------------------ | ---------------------------------- |
| \`--v-tree-chevron-size\`       | \`20px\`                 | Width and height of chevron button |
| \`--v-tree-chevron-hover-bg\`   | Light/Dark values        | Background on hover                |
| \`--v-tree-chevron-transition\` | \`transform 0.15s ease\` | Animation for rotation             |

**Example:**
\`\`\`css
:root {
/_ Larger, slower chevron _/
--v-tree-chevron-size: 24px;
--v-tree-chevron-transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
\`\`\`

---

### Icon

File and folder icon styling.

| Variable                  | Default Value    | Description                 |
| ------------------------- | ---------------- | --------------------------- |
| \`--v-tree-icon-spacing\` | \`6px\`          | Space between icon and text |
| \`--v-tree-icon-color\`   | \`currentColor\` | Icon color                  |

**Example:**
\`\`\`css
:root {
--v-tree-icon-spacing: 10px;
--v-tree-icon-color: rgb(100, 116, 139);
}
\`\`\`

---

### Typography

Font settings for tree text.

| Variable                   | Default Value | Description            |
| -------------------------- | ------------- | ---------------------- |
| \`--v-tree-row-font-size\` | \`13px\`      | Font size for row text |

**Example:**
\`\`\`css
:root {
/_ Larger, bolder text _/
--v-tree-row-font-size: 15px;
}

.tree-row\_\_name {
font-weight: 500;
font-family: 'Inter', sans-serif;
}
\`\`\`

---

### Input Field (Rename/Edit)

Styling for the inline rename input.

| Variable                        | Light Mode           | Dark Mode            | Description             |
| ------------------------------- | -------------------- | -------------------- | ----------------------- |
| \`--v-tree-input-bg\`           | \`oklch(0.922 0 0)\` | \`oklch(0.269 0 0)\` | Input background        |
| \`--v-tree-input-border\`       | \`oklch(0.922 0 0)\` | \`oklch(0.269 0 0)\` | Input border color      |
| \`--v-tree-input-border-width\` | \`1px\`              | \`1px\`              | Input border width      |
| \`--v-tree-input-text-color\`   | \`oklch(0.145 0 0)\` | \`oklch(0.985 0 0)\` | Input text color        |
| \`--v-tree-input-focus-bg\`     | \`oklch(0.97 0 0)\`  | \`oklch(0.269 0 0)\` | Background when focused |
| \`--v-tree-input-focus-border\` | \`oklch(0.708 0 0)\` | \`oklch(0.439 0 0)\` | Border when focused     |
| \`--v-tree-input-padding\`      | \`2px 6px\`          | \`2px 6px\`          | Internal padding        |
| \`--v-tree-input-font-size\`    | \`13px\`             | \`13px\`             | Font size               |

**Example:**
\`\`\`css
:root {
/_ Custom input styling _/
--v-tree-input-bg: white;
--v-tree-input-border: rgb(209, 213, 219);
--v-tree-input-border-width: 2px;
--v-tree-input-focus-border: rgb(59, 130, 246);
--v-tree-input-padding: 4px 8px;
}
\`\`\`

---

### Row Actions

Buttons that appear on row hover (delete, rename, etc.).

| Variable                             | Default Value         | Description                    |
| ------------------------------------ | --------------------- | ------------------------------ |
| \`--v-tree-actions-gap\`             | \`4px\`               | Space between action buttons   |
| \`--v-tree-actions-spacing\`         | \`8px\`               | Space from row text to actions |
| \`--v-tree-actions-opacity-hidden\`  | \`0\`                 | Opacity when hidden            |
| \`--v-tree-actions-opacity-visible\` | \`1\`                 | Opacity when visible           |
| \`--v-tree-actions-transition\`      | \`opacity 0.1s ease\` | Fade transition                |

**Example:**
\`\`\`css
:root {
/_ Always visible, no fade _/
--v-tree-actions-opacity-hidden: 1;
--v-tree-actions-transition: none;
}
\`\`\`

---

### Transitions & Animations

Control animation timing and effects.

| Variable                        | Default Value                  | Description                 |
| ------------------------------- | ------------------------------ | --------------------------- |
| \`--v-tree-row-transition\`     | \`background-color 0.1s ease\` | Row hover/select transition |
| \`--v-tree-chevron-transition\` | \`transform 0.15s ease\`       | Chevron rotation animation  |
| \`--v-tree-actions-transition\` | \`opacity 0.1s ease\`          | Actions fade animation      |

**Example - Slower Animations:**
\`\`\`css
:root {
--v-tree-row-transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
--v-tree-chevron-transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
\`\`\`

**Example - No Animations:**
\`\`\`css
:root {
--v-tree-row-transition: none;
--v-tree-chevron-transition: none;
--v-tree-actions-transition: none;
}
\`\`\`

---

### Drag Preview

Styling for the custom drag ghost/preview.

#### Colors

| Variable                             | Light Mode           | Dark Mode            | Description         |
| ------------------------------------ | -------------------- | -------------------- | ------------------- |
| \`--v-tree-drag-preview-bg\`         | Gradient (light)     | Gradient (dark)      | Background gradient |
| \`--v-tree-drag-preview-text\`       | \`oklch(0.985 0 0)\` | \`oklch(0.205 0 0)\` | Text color          |
| \`--v-tree-drag-preview-icon-color\` | \`currentColor\`     | \`currentColor\`     | Icon color          |

#### Dimensions

| Variable                            | Default Value   | Description            |
| ----------------------------------- | --------------- | ---------------------- |
| \`--v-tree-drag-preview-gap\`       | \`0.5rem\`      | Space between elements |
| \`--v-tree-drag-preview-min-width\` | \`120px\`       | Minimum width          |
| \`--v-tree-drag-preview-max-width\` | \`300px\`       | Maximum width          |
| \`--v-tree-drag-preview-padding\`   | \`0.5rem 1rem\` | Internal padding       |

#### Typography

| Variable                                 | Default Value | Description            |
| ---------------------------------------- | ------------- | ---------------------- |
| \`--v-tree-drag-preview-font-size\`      | \`13px\`      | Main font size         |
| \`--v-tree-drag-preview-font-weight\`    | \`600\`       | Font weight            |
| \`--v-tree-drag-preview-text-font-size\` | \`inherit\`   | Text element font size |

#### Effects

| Variable                                  | Default Value                | Description          |
| ----------------------------------------- | ---------------------------- | -------------------- |
| \`--v-tree-drag-preview-border-radius\`   | \`var(--radius-lg, 0.5rem)\` | Corner radius        |
| \`--v-tree-drag-preview-shadow\`          | Complex shadow               | Drop shadow          |
| \`--v-tree-drag-preview-backdrop-filter\` | \`blur(10px)\`               | Backdrop blur effect |

#### Badge (Multi-select count)

| Variable                                    | Light Mode                 | Dark Mode            | Description         |
| ------------------------------------------- | -------------------------- | -------------------- | ------------------- |
| \`--v-tree-drag-preview-badge-bg\`          | \`rgba(255,255,255,0.25)\` | \`rgba(0,0,0,0.25)\` | Badge background    |
| \`--v-tree-drag-preview-badge-padding\`     | \`0.125rem 0.5rem\`        | \`0.125rem 0.5rem\`  | Badge padding       |
| \`--v-tree-drag-preview-badge-radius\`      | \`0.75rem\`                | \`0.75rem\`          | Badge corner radius |
| \`--v-tree-drag-preview-badge-font-size\`   | \`11px\`                   | \`11px\`             | Badge font size     |
| \`--v-tree-drag-preview-badge-font-weight\` | \`700\`                    | \`700\`              | Badge font weight   |

**Example - Minimal Drag Preview:**
\`\`\`css
:root {
--v-tree-drag-preview-bg: rgba(0, 0, 0, 0.8);
--v-tree-drag-preview-text: white;
--v-tree-drag-preview-padding: 0.25rem 0.75rem;
--v-tree-drag-preview-font-size: 12px;
--v-tree-drag-preview-font-weight: 400;
--v-tree-drag-preview-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
--v-tree-drag-preview-backdrop-filter: none;
}
\`\`\`

---

## Usage Examples

### Example 1: Compact Tree

\`\`\`css
:root {
--v-tree-row-margin: 0 2px;
--v-tree-row-font-size: 12px;
--v-tree-chevron-size: 16px;
--v-tree-icon-spacing: 4px;
--v-tree-input-padding: 1px 4px;
--v-tree-input-font-size: 12px;
}
\`\`\`

### Example 2: Large/Spacious Tree

\`\`\`css
:root {
--v-tree-row-margin: 0 8px;
--v-tree-row-font-size: 16px;
--v-tree-chevron-size: 28px;
--v-tree-icon-spacing: 12px;
--v-tree-input-padding: 6px 12px;
--v-tree-input-font-size: 16px;
}
\`\`\`

### Example 3: High Contrast Theme

\`\`\`css
:root {
--v-tree-bg: #000;
--v-tree-text: #fff;
--v-tree-row-hover-bg: rgba(255, 255, 255, 0.1);
--v-tree-row-selected-bg: rgba(0, 123, 255, 0.4);
--v-tree-row-focus-ring: yellow;
--v-tree-row-focus-ring-width: 2px;
--v-tree-indicator-color: lime;
}
\`\`\`

### Example 4: Soft/Rounded Theme

\`\`\`css
:root {
--v-tree-row-margin: 0 8px 4px 8px;
--v-tree-input-padding: 6px 12px;
--v-tree-drag-preview-border-radius: 1rem;
}

.tree-row {
border-radius: 8px !important;
}

.tree-row\_\_edit-input {
border-radius: 8px !important;
}
\`\`\`

### Example 5: No Animations

\`\`\`css
:root {
--v-tree-row-transition: none;
--v-tree-chevron-transition: none;
--v-tree-actions-transition: none;
}

- {
  transition: none !important;
  animation: none !important;
  }
  \`\`\`

### Example 6: Custom Font Family

\`\`\`css
:root {
--v-tree-row-font-size: 14px;
--v-tree-input-font-size: 14px;
--v-tree-drag-preview-font-size: 14px;
}

.tree-row**name,
.tree-row**edit-input,
.drag-preview {
font-family: 'Monaco', 'Courier New', monospace;
}
\`\`\`

---

## Pre-built Themes

The demo includes 8 pre-built themes demonstrating different customization approaches:

1. **Default** - Clean, modern look
2. **VSCode** - Dark theme inspired by Visual Studio Code
3. **GitHub Light** - Bright, GitHub-inspired light theme
4. **GitHub Dark** - GitHub's dark mode aesthetic
5. **Notion** - Soft, minimal Notion-style theme
6. **Forest** - Nature-inspired green theme
7. **Ocean** - Cool blue aquatic theme
8. **Sunset** - Warm orange/pink gradient theme

See the theme selector in \`TreeDemo.vue\` for implementation examples.

---

## Advanced Customization

### Overriding Fallbacks

Some variables use fallbacks (e.g., \`var(--radius-sm, 4px)\`). Override the primary variable in tailwind.css:

\`\`\`css
:root {
--radius-sm: 6px;
--radius-lg: 12px;
}
\`\`\`

### Per-Instance Customization

Apply CSS variables to specific tree instances using classes:

\`\`\`vue
<FileTree class="my-custom-tree" />
\`\`\`

\`\`\`css
.my-custom-tree {
--v-tree-row-hover-bg: rgba(59, 130, 246, 0.1);
}
\`\`\`

### Dynamic Theming with JavaScript

\`\`\`typescript
function applyTheme(theme: 'compact' | 'spacious' | 'default') {
const root = document.documentElement;

if (theme === 'compact') {
// Note: Row height is now controlled via the itemHeight prop
root.style.setProperty('--tree-row-font-size', '12px');
} else if (theme === 'spacious') {
root.style.setProperty('--tree-row-font-size', '15px');
}
}
\`\`\`

---

## Summary: All Customizable Variables

**Total: 61 CSS variables** covering every aspect of the tree:

- **Colors**: 19 variables
- **Dimensions**: 13 variables
- **Typography**: 8 variables
- **Spacing**: 7 variables
- **Effects**: 6 variables
- **Transitions**: 4 variables
- **Borders**: 4 variables

Every visual property is configurable, making this a truly headless component that adapts to any design system.

---

## Need Help?

- Check the demo (\`TreeDemo.vue\`) for live examples
- Review the source: \`FileTree.vue\`, \`TreeRow.vue\`, \`PseudomorphismDragItem.vue\`
- All defaults are in \`/assets/css/tailwind.css\`

Happy customizing! 🎨
