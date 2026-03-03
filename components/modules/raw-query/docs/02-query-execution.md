# Query Execution Pipeline

The execution of a SQL query from the Raw Query Code Editor is a complex synchronization of AST (Abstract Syntax Tree) string parsing, variable replacement, network streams, and error tracebacks managed largely by `hooks/useQueryExecution.ts`.

## 1. Current Statement Isolation

Rather than blindly running the whole file string:

- `getCurrentStatement(editorView)` dynamically reads the user's text cursor position.
- CodeMirror AST boundaries are resolved into `treeNodes`.
- The hook safely resolves what exact semantic bounds constitute the intended SQL operation without requiring manual text highlighting.

## 2. Parameter Replacement

Variables wrapped securely via `--@param=name:value` or within the `VariableEditor.vue` layout are injected safely via JSON. `fileVariables` acts as a reactive parameter definition context during `$fetch` payloads.

## 3. The Two Execution Tracks

The engine must cater for two drastically varying data scales mapping `executeQuery`:

1. **EXPLAIN ANALYZE**: Resolves instantly via standard JSON `$fetch('/api/query/raw-execute')`.
2. **Standard Execution**: Leverages `executeStreamingQuery` to establish a persistent generic `AbortController` stream fetching NDJSON sequentially to protect HeraQ memory boundaries.

## 4. `DatabaseError` Diagnostics Interface

We map errors tightly. If the pipeline encounters a fault parsing statements on the backend proxy adapter, it securely catches and parses `DatabaseError`.

```ts
import { applySqlErrorDiagnostics } from '~/components/base/code-editor/utils';
```

Inside both the `onResponseError` callback (Fetch) and `onError` callback (Streaming), the execution injects the diagnostic payload directly onto the interactive IDE interface:

- A red `Diagnostic` syntax underline matches the exact character boundary dynamically shifted by `mapErrorPosition()`.
- Standard hover tooltips allow the user to immediately identify precisely why execution halted (e.g., `severity` = `ERROR`, `length`, `routine = check_stack_depth`, etc.).
