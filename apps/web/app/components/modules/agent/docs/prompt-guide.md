# Agent Prompt Guide

Useful prompts and test cases for every tool and block type in the DB Agent.
Use these to verify correct rendering, edge-case handling, and UX appearance during development.

---

## General useful prompts

| Goal                   | Prompt                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| Quick sanity check     | `What tables are in the current database?`                                |
| Schema overview        | `Summarize the schema and highlight the most important tables.`           |
| Debug a slow query     | `Suggest safe next steps for debugging a slow query on the orders table.` |
| Explore relationships  | `Show me the foreign key relationships in this schema.`                   |
| Free text answer first | `Explain what normalisation means and why it matters here.`               |

---

## `generate_query` — `AgentQueryBlock`

Triggers: agent generates a SQL query in response to a request.

**Basic test:**

```
Write a query that returns the top 10 customers by total order value.
```

**Edge cases:**

```
# Long query (ensure horizontal scroll in block works)
Write a query with many LEFT JOINs to combine orders, order_items, products, and customers.

# Mutation guard (if enabled, should ask for approval)
Write a DELETE statement that removes orders older than 2 years.

# No adapter — should still generate SQL without executing
(with no DB connection) Write a query that counts rows in a table called `events`.
```

---

## `render_table` — `AgentTableBlock`

Triggers: agent executes a query and returns rows as a table.

**Basic test:**

```
Show me the first 20 rows from the users table.
```

**Edge cases:**

```
# Large result set (pagination / scroll)
Show all rows from the largest table in the schema.

# Empty result
Run: SELECT * FROM users WHERE 1 = 0

# Single row
Show the user with the highest id.

# Many columns (horizontal scroll)
Select all columns from a table with 15+ columns.
```

---

## `visualize_table` — `AgentVisualizeTableBlock`

Triggers: agent produces a chart from a query result.

**Basic test:**

```
Show me a bar chart of orders grouped by month for the last 12 months.
```

**Edge cases:**

```
# Pie chart
Show me the distribution of users by country as a pie chart.

# Time series / line chart
Plot the number of signups per day over the past 30 days.

# No numeric column — agent should explain the limitation
Visualize the users table grouped by first name.
```

---

## `explain_query` — `AgentExplainBlock`

Triggers: agent runs EXPLAIN / EXPLAIN ANALYZE on the last generated query.

**Basic test (after generating a query):**

```
Explain that last query and tell me if there are any performance issues.
```

**Or directly:**

```
Run an EXPLAIN on: SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC LIMIT 100;
```

**Edge cases:**

```
# Query on a non-indexed column (expect suggestion to add index)
EXPLAIN SELECT * FROM events WHERE event_type = 'click';

# JOIN-heavy query
EXPLAIN SELECT o.*, u.email FROM orders o JOIN users u ON o.user_id = u.id WHERE o.total > 500;
```

---

## `detect_anomaly` — `AgentAnomalyBlock`

Triggers: agent scans a table for data quality issues (nulls, duplicates, outliers, etc.).

**Requires:** schema snapshot loaded.

**Basic test:**

```
Scan the orders table for data quality issues.
```

**Edge cases:**

```
# Table with no issues — expect clean score
Check the products table for anomalies.

# Null-heavy column
Are there any rows in the users table where email is null?

# Duplicate detection
Look for duplicate entries in the customers table.
```

---

## `describe_table` — `AgentDescribeBlock`

Triggers: agent returns column-level metadata for a table.

**Requires:** schema snapshot loaded.

**Basic test:**

```
Describe the orders table and tell me about each column.
```

**Edge cases:**

```
# Table with many columns
Describe the table that has the most columns in the schema.

# Table with enum-like values
Show me the column types in the status lookup table.

# Non-existent table (error handling)
Describe a table called `xyz_fake_table`.
```

---

## `askClarification` — `BlockMessageQuiz`

Triggers: agent calls `askClarification` when a request is genuinely ambiguous.
Renders as an inline quiz card inside the chat (not a dialog popup).

**Single-choice question:**

```
I want a report.
```

_(agent should ask: what type of report, which time range, etc.)_

**Multiple-choice question:**

```
Analyse my data.
```

_(agent should ask: which tables, which metrics, etc.)_

**Open-ended question:**

```
Help me with my query.
```

_(agent should ask for the query text or context)_

**Verification — quiz should NOT re-trigger after submission:**
After submitting quiz answers, send another vague message:

```
And also show me that.
```

The agent should answer without asking the same clarification again. (System prompt instructs: after `[Quiz answers]` in history, never call `askClarification` again.)

**Skip behaviour:**

- Required questions: submit button is disabled unless all required questions have answers.
- Optional questions: a "Skip" button appears and advances to the next question or submits.

**Multi-question flow:**
To force multiple questions in a single quiz call, use a prompt that hits multiple ambiguities:

```
Build me a dashboard.
```

---

## Block rendering checklist

Use this when visually verifying a new build:

- [ ] `text` block: plain text renders without markdown formatting
- [ ] `markdown` block: headings, bold, lists, inline code render correctly
- [ ] `code` block: syntax highlighting, copy button, horizontal scroll for long lines
- [ ] `loading` block: correct label for each tool while streaming
- [ ] `error` block: red error card with descriptive message
- [ ] `tool` block: each tool block renders its dedicated component
- [ ] `approval` block: approve/deny buttons visible, wired to `addToolApprovalResponse`
- [ ] `source` block: URL/document source with title and icon
- [ ] `quiz` block: inline card with chips, text input, progress dots, Back/Skip/Next/Submit
- [ ] `reasoning` block: collapsible reasoning panel (only when `showReasoning = true`)

---

## Debugging tips

**Quiz not appearing:**

1. Check `useDbAgentRenderer.ts` → `toolPartToBlocks` has the `askClarification` branch.
2. Verify the tool part's `state === 'output-available'` (not `input-streaming`).
3. Check `types/index.ts` — `AgentQuizBlock` must be in the `AgentBlock` union.

**Quiz submits but agent doesn't continue:**

1. Confirm `AgentWorkspace.handleQuizSubmit(text)` calls `sendMessage(text)`.
2. Check that `formatAnswers()` in `BlockMessageQuiz` produces a `[Quiz answers]` prefix.
3. Verify the system prompt in `tools.ts` has the "After `[Quiz answers]`..." instruction.

**Tool block renders wrong component:**
Check `TOOL_COMPONENT_MAP` in `useDbAgentRenderer.ts` — all `DbAgentToolName` keys must be present.
