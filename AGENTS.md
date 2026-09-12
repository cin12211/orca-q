# HeraQ / OrcaQ Agent Guide

Orcaq is next-gen database client. Friendly, powerful
This repo is a Nuxt 3 + Vue 3 + TypeScript with Electron
desktop support.

## Repo Layout And Important Directories

- `components/` contains Vue UI. Reusable primitives live in `components/base`
  and shadcn-style components live in `components/ui`.
- `components/base/data-grid/` contains the shared AG Grid wrapper, copy context
  menu, and reusable grid renderers/headers. Read
  `components/base/data-grid/docs/USAGE_GUIDE.md` before changing shared grid
  behavior or adding a new generic grid feature.
- `components/modules/` contains feature modules. Important modules include
  `quick-query`, `raw-query`, `management-connection`, `management-schemas`,
  `management-explorer`, `erd-diagram`, `workspace`, and `settings`.
- `components/modules/quick-query/` is the table browsing/editing feature. Keep
  extracted composables in its `hooks/` directory and pure helpers in its
  `utils/` directory.
- `core/` contains shared app logic used by the frontend, including composables,
  helpers, constants, stores, types, persistence abstractions, and contexts.
- `server/` contains Nuxt server API routes and backend infrastructure for
  database adapters, drivers, metadata, query execution, Redis, and AI features.
- `electron/` contains the Electron desktop wrapper, persistence schema, and
  desktop-specific implementation.
- `pages/` contains Nuxt file-based routes for workspaces, connections, ERD,
  schema management, raw query, and quick query.
- `plugins/` contains Nuxt plugins. Be careful changing app initialization or
  storage hydration because many Nuxt tests depend on those paths.
- `test/unit`, `test/nuxt`, `test/e2e`, and `test/playwright` contain the test
  suites. Prefer the narrowest relevant suite first, then broaden.
- `docs/` contains architecture, project structure, API, module flow, business
  rules, storage, and refactoring guidance. Read the specific doc that matches
  the task before changing broad behavior.
- Shared grid usage notes live in `components/base/data-grid/docs/USAGE_GUIDE.md`.

## Component Reuse Rules

- Before creating a new UI component, check existing components in
  `components/base` and `components/ui`.
- If an existing component already fits the need, reuse it instead of creating
  another component.
- Create a new component only when there is no suitable existing base or UI
  component, or when the new behavior is clearly feature-specific.

## Icon Usage Rules

- Prefer Hugeicons for UI icons. Use the `hugeicons:` collection first so icon
  style stays consistent across the app.
- When adding or changing any `hugeicons:*` icon name, verify that the icon
  actually exists in `node_modules/@iconify-json/hugeicons/icons.json` before
  committing the change. Do not assume names from another collection are
  available in Hugeicons.
- Use another collection such as `lucide:` only when there is no suitable
  verified Hugeicons equivalent, and use that collection prefix explicitly (for
  example `lucide:chart-pie`).

## Typography & Styling Rules

- When 10px font size is needed (text 10), always use `text-xxs` (defined in `tailwind.css` as `0.625rem`). Never use arbitrary classes like `text-[10px]` or `text-10`.
- For compact controls (height 24px), use component size prop `size="xxs"` (e.g. `Input`, `Button`) instead of custom size utility overrides.

## How To Run The Project

Commands are defined in `package.json`. This repo supports Bun, npm scripts, and
Nuxt/Electron workflows.

- Install dependencies: `bun install` or the package-manager equivalent already
  used by the workspace.
- Run the web app locally: `bun run dev` or `bun run nuxt:dev`.
- Build Nuxt: `bun run nuxt:build`.
- Generate static output: `bun run nuxt:generate`.
- Run Electron in development: `bun run electron:dev`.
- Compile Electron TypeScript: `bun run electron:compile`.
- Build/package Electron: `bun run electron:build`, `bun run electron:pack`, or
  `bun run electron:build:mac-m`.
- Run Storybook: `bun run storybook`.
- Format all files: `bun run format`.
- Check formatting: `bun run format:check`.
- Typecheck: `bun run typecheck`.

## Tests And Verification

> **For any test-related task, load the skill first:** > `.github/skills/testing-orcaq/SKILL.md`
> It contains the exact commands, fixture profiles, and decision rules.
> Full reference: `docs/TESTING_GUIDE.md`

- Typecheck: `bun run typecheck`.
- Unit tests: `bun test:unit`
- Nuxt/component tests: `bun test:nuxt`
- All Vitest suites: `bun test:all`
- API/integration tests (auto fixtures): `bun test:api`
- API/integration tests (fixtures already up): `bun test:api:raw`
- Playwright E2E (auto fixtures): `bun test:e2e`
- Playwright E2E (fixtures already up): `bun test:e2e:raw`
- Start fixtures: `bun test:fixtures:up`
- Stop fixtures: `bun test:fixtures:down`

## Verification Rules

- Any source-code modification must pass `bun run typecheck` + `bun test:unit`.
- Do not claim a task is complete if type checking fails.
- Run the smallest relevant test suite first — never start all fixtures to test a single DB.
- Use `bun test:api:raw` / `bun test:e2e:raw` when fixtures are already running.
- Run broader suites only when the change scope requires it.
- Clearly report:
  - executed commands
  - failing commands
  - whether failures are related to the current change

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
