# Result Tabs & State Management

A cornerstone of the OrcaQ `raw-query` module is persisting multiple execution views dynamically without blocking the main thread or wiping state on subsequent executions.

## 1. Context Interface

The module utilizes an interface known as `ExecutedResultItem` tightly coupled to the Result UI pane.

```ts
export interface ExecutedResultItem {
  id: string; // The UUID mapping to the specific Result Tab DOM
  metadata: {
    queryTime: number;
    statementQuery: string;
    executedAt: Date;
    executeErrors:
      | { message: string; data: Partial<DatabaseError> }
      | undefined;
    fieldDefs?: FieldDef[];
    connection?: Connection | undefined;
  };
  result: RowData[];
  seqIndex: number;
  view: 'result' | 'error' | 'info' | 'raw' | 'agent' | 'explain';
}
```

## 2. Managing Output Data via `useResultTabs`

Inside `hooks/useResultTabs.ts`, all result histories are pushed into a `shallowRef` map called `executedResults: Map<string, ExecutedResultItem>`.

Because data payloads spanning thousands of NDJSON records are vast:

- We lean heavily on `shallowRef`. Deep tracking massive JSON sets drastically drops JavaScript performance via heavy Vue proxies.
- Reactive assignments override `resultTabs` values on complete execution updates.

## 3. UI Synchronization (`RawQueryResultTabs.vue`)

Each execution spins up a new independent identifier referencing its specific stream payload, enabling the UI to build out:

- Data Grid views (Raw Query executions map to `<DynamicTable>` layouts safely).
- Explain Plan visuals (Maps JSON metrics via EXPLAIN outputs to `view: 'explain'`).
- Traceback Overviews (Maps `DatabaseError` objects from the Proxy directly into visual lists tracking file/table/schema points on faults mapping `view: 'error'`).
