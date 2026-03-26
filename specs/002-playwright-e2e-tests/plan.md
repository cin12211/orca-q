# Implementation Plan: Playwright Browser E2E Tests — Workspace & Connection Flow

**Branch**: `002-playwright-e2e-tests` | **Date**: 2026-03-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-playwright-e2e-tests/spec.md`

## Summary

Add real-browser end-to-end tests using Playwright that cover the full workspace and connection management flow of the OrcaQ application: create workspace, search workspaces, open connection management, add a connection (2-step wizard), and navigate into a workspace. Tests run against the Nuxt dev server (SPA mode, SSR disabled) and use the Page Object Model pattern for maintainability.

## Technical Context

**Language/Version**: TypeScript 5.6  
**Primary Dependencies**: `@playwright/test` (new install), `playwright-core ^1.58.2` (already in devDeps)  
**Storage**: In-browser state via Pinia stores; `window.workspaceApi` / `window.connectionApi` Electron IPC bridges (not available in web mode — state is ephemeral per browser session)  
**Testing**: Playwright Test runner with `playwright.config.ts` at repo root  
**Target Platform**: Chromium (desktop), Nuxt SPA running at `http://localhost:3000`  
**Project Type**: Browser E2E test suite for an existing Nuxt 3 SPA  
**Performance Goals**: All tests complete in < 60 seconds; individual test timeout 30 seconds  
**Constraints**: No real Electron IPC in web mode — workspace/connection state held in Pinia store memory (resets on page reload); tests that need real DB credentials must skip gracefully when `PG_CONNECTION` is absent  
**Scale/Scope**: 6 user stories → ~15–20 Playwright test cases across 3 spec files + 2 page-object files

## Mocking Strategy

Since the application uses Electron IPC (`window.workspaceApi.*`, `window.connectionApi.*`) for persistence, and Playwright runs against the **web** Nuxt dev server (not Electron), the IPC bridge is **not available**. The Pinia stores will either call native-undefined methods or the app has a web-mode fallback.

**Strategy**: Use `page.addInitScript()` to inject mock implementations of `window.workspaceApi` and `window.connectionApi` before the page loads. This simulates the Electron preload bridge in web mode without needing the Electron renderer.

```ts
// In beforeEach / page fixture
await page.addInitScript(() => {
  const workspaces: any[] = [];
  window.workspaceApi = {
    getWorkspaces: async () => workspaces,
    createWorkspace: async (ws: any) => {
      workspaces.push(ws);
      return ws;
    },
    updateWorkspace: async (ws: any) => {
      const i = workspaces.findIndex(w => w.id === ws.id);
      workspaces[i] = ws;
      return ws;
    },
    deleteWorkspace: async (id: string) => {
      const i = workspaces.findIndex(w => w.id === id);
      workspaces.splice(i, 1);
    },
  };
  const connections: any[] = [];
  window.connectionApi = {
    getConnections: async () => connections,
    createConnection: async (c: any) => {
      connections.push(c);
      return c;
    },
    deleteConnection: async (id: string) => {
      const i = connections.findIndex(c => c.id === id);
      connections.splice(i, 1);
    },
    testConnection: async () => ({ success: true }),
  };
});
```

> If the app already handles missing IPC gracefully in SPA mode (e.g., localStorage fallback), this script is still safe to add and will take precedence.

## Project Structure

### Documentation (this feature)

```text
specs/002-playwright-e2e-tests/
├── spec.md            # Feature spec (complete)
├── plan.md            # This file
├── tasks.md           # Task list (created alongside this file)
└── checklists/
    └── requirements.md
```

### Source Code (additions to repository root)

```text
playwright.config.ts                        # Playwright config (new)

test/playwright/
├── pages/
│   ├── WorkspacesPage.ts                   # Page object — workspace list/home
│   └── ConnectionModalPage.ts              # Page object — connection management modal
├── workspace.spec.ts                       # US1, US2, US3 — workspace CRUD + search
├── connection.spec.ts                      # US4, US5 — connection modal + add wizard step 1
└── connection-credentials.spec.ts          # US6 — step 2 credentials + test (skips without PG_CONNECTION)
```

## Playwright Configuration Details

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/playwright',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // state is shared per browser session
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun nuxt:dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
```

## Selector Strategy

Prefer (in order of preference):

1. `page.getByRole()` — semantic role selectors
2. `page.getByText()` — visible text content
3. `page.getByPlaceholder()` — input placeholders
4. `page.getByLabel()` — form labels
5. `data-testid` attributes (add sparingly to components if no other stable selector exists)

Avoid: CSS class selectors, XPath.

## Test Isolation

Each test starts a fresh browser page via Playwright's `page` fixture. The `addInitScript` mock resets state per page load. Tests that create workspaces/connections use `afterEach` cleanup or rely on the fresh in-memory state of each test's nav cycle.

## Phase Execution

| Phase            | Description                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Setup            | Install `@playwright/test`, create `playwright.config.ts`, add `bun test:playwright` script |
| Page Objects     | Create `WorkspacesPage.ts` and `ConnectionModalPage.ts`                                     |
| Core Tests       | `workspace.spec.ts` (US1–US3), `connection.spec.ts` (US4–US5)                               |
| Credential Tests | `connection-credentials.spec.ts` (US6, skippable)                                           |
| Validation       | Run full suite, verify pass/skip rates                                                      |
