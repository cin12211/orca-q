# Raw Query Architecture

The `components/modules/raw-query` module handles the entire interactive SQL statement interface inside OrcaQ.
It follows a strict **"Facade Hook"** architectural pattern to isolate heavy execution business logic from the `vue` display templates.

## 1. Directory Structure

```text
raw-query/
├── components/           # Presentation UI components (Header, Footer, CodeMirror wrappers)
├── constants/            # Enum definitions (Explain serialization types)
├── hooks/                # The business logic engines
├── interfaces/           # Types specific strictly to the UI boundaries (Mapped columns, Tab Items)
├── utils/                # Helper formatting services
└── RawQuery.vue          # The main Entrypoint Orchestrator
```

## 2. Key UI Principles

1. **Dumb Components**: Files like `RawQueryEditorHeader.vue` and `RawQueryEditorFooter.vue` do not fetch data or manage connections. Instead, they strictly consume `v-model` properties and `emits` events (e.g. `@on-execute-current`).
2. **Context Menu Binding**: The `@codemirror/view` extension natively integrates our internal design system `Context Menu` items seamlessly on text-selection right-clicks via the `useRawQueryEditorContextMenu` manager.

## 3. The `useRawQueryEditor` API Facade

To prevent `RawQuery.vue` from becoming bloated with thousands of lines, all isolated hooks are aggregated cleanly inside `hooks/useRawQueryEditor.ts`.

It behaves as the bridge mapping the:

- Active File metadata context (`useRawQueryFileContent`)
- CodeMirror extension configurations (`useSqlEditorExtensions`)
- NDJSON Execution lifecycle handlers (`useQueryExecution`)
- Active and cached SQL Output Tabs (`useResultTabs`)

The `RawQuery.vue` calls `useRawQueryEditor()` once, and simply unpacks specific values to pass visually to the `.vue` template components using `toRefs()`.
