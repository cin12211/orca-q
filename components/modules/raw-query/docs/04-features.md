# Features of the Raw Query Module

The `raw-query` module is built to provide a powerful, IDE-like experience for writing, testing, and debugging SQL queries directly within HeraQ. It features several advanced capabilities designed for high performance and developer productivity.

## 1. Code Editor Intelligence

- **Syntax Highlighting & Autocomplete**: Powered by CodeMirror 6 extensions, instantly providing contextual SQL keyword formatting.
- **Context-Aware Execution**: The `getCurrentStatement` AST parser allows users to place their cursor anywhere in a massive SQL file and execute specifically that single block without needing to manually highlight the command.
- **SQL Formatting**: Built-in support to instantly format either the entire file or just the current statement underneath the cursor via the `sql-formatter` integration.

## 2. Dynamic Query Variables

- **In-file Parameterization**: Users can inject strictly typed variables via `--@param=name:value` comments.
- **Variable Editor GUI**: A dedicated interface (`VariableEditor.vue`) for toggling and overriding file variables natively using a JSON-like schema editor mapped via `useRawQueryFileContent`.

## 3. Advanced Execution & Analysis

- **Streaming NDJSON Results**: Instead of waiting for a 1-million-row dataset to fully resolve in memory, the engine streams the dataset via `pg-query-stream` in chunks. The UI renders rows progressively, saving browser memory and keeping the application responsive.
- **EXPLAIN ANALYZE Generation**: Single-click toggles translate any query into a rich database execution plan, exposing underlying table scans, memory costs, and timing.

## 4. Multi-Tab Result Tracking

- **Persistent Output History**: Every consecutive query execution spins up a brand new tab, heavily optimized via `shallowRef`. This permits users to easily tab back and forth comparing different query tests without losing previous results.
- **Diverse View Modes**: Data automatically adapts visually based on the operation type—switching between an infinite-scroll `DynamicTable` for `SELECT` arrays, dedicated JSON tree inspectors for `EXPLAIN`, or the Error UI for tracebacks.

## 5. IDE-Level Error Diagnostics

- **Native Underline Tracebacks**: Instead of a generic "Query Failed" toast, the query engine extracts precise `DatabaseError` properties from the Postgres AST.
- **Offset Mapping**: The CodeMirror interface automatically draws a squiggly red line exactly underneath the faulty syntax (shifted mapped coordinates), accompanied by detailed hover hints containing the `Code`, `Position`, and Postgres `Hint`.
