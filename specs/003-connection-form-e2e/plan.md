# Implementation Plan: Connection Form E2E Tests (SSH + SSL)

**Feature**: 003-connection-form-e2e  
**Branch**: `003-connection-form-e2e`  
**Created**: 2026-03-13

---

## Tech Stack

- **Test Runner**: `@playwright/test@1.58.2` (already installed)
- **Browser**: Chromium (already cached)
- **Config**: `playwright.config.ts` at repo root (baseURL: `http://localhost:3000`)
- **Pattern**: Page Object Model (POM) extending Feature 002 foundation
- **Package Manager**: Bun

---

## Architecture

### Existing Foundation (Feature 002)

- `test/playwright/pages/WorkspacesPage.ts` — workspace creation, navigation
- `test/playwright/pages/ConnectionModalPage.ts` — connection modal, step 1, step 2 (connection-string tab)
- `playwright.config.ts` — configured, `reuseExistingServer: true`, 30s timeout

### New Files

```
test/playwright/
├── pages/
│   └── ConnectionModalPage.ts      ← EXTEND with form tab + SSL + SSH methods
├── connection-form.spec.ts          ← US1 (form tab rendering) + US2 (create via form)
├── connection-form-ssl.spec.ts      ← US3 (SSL accordion + fields)
├── connection-form-ssh.spec.ts      ← US4 (SSH accordion + fields)
└── connection-form-live.spec.ts     ← US5 (combined live test; gated behind env var)
```

---

## Selector Strategy

All selectors based on actual rendered HTML from components:

### `CreateConnectionModal.vue` — Step 2 Form Tab

| Element               | Selector                                              |
| --------------------- | ----------------------------------------------------- |
| "Connection Form" tab | `page.getByRole('tab', { name: /connection form/i })` |
| Connection Name input | `page.locator('#connection-name')`                    |
| Host input            | `page.locator('#host')`                               |
| Port input            | `page.locator('#port')`                               |
| Username input        | `page.locator('#username')`                           |
| Password input        | `page.locator('#password')`                           |
| Database input        | `page.locator('#database')`                           |

### `ConnectionSSLConfig.vue`

| Element                     | Selector                              |
| --------------------------- | ------------------------------------- |
| SSL accordion trigger       | `page.getByText('SSL Configuration')` |
| Enable SSL toggle           | `page.locator('#ssl-enabled')`        |
| SSL Mode select             | `page.locator('#ssl-mode')`           |
| CA Certificate textarea     | `page.locator('#ssl-ca')`             |
| Client Certificate textarea | `page.locator('#ssl-cert')`           |
| SSL Key textarea            | `page.locator('#ssl-key')`            |

### `ConnectionSSHTunnel.vue`

| Element               | Selector                        |
| --------------------- | ------------------------------- |
| SSH accordion trigger | `page.getByText('SSH Tunnel')`  |
| Over SSH toggle       | `page.locator('#ssh-enabled')`  |
| SSH Host input        | `page.locator('#ssh-host')`     |
| SSH Port input        | `page.locator('#ssh-port')`     |
| SSH Username input    | `page.locator('#ssh-user')`     |
| SSH Password input    | `page.locator('#ssh-password')` |
| SSH Use Key checkbox  | `page.locator('#ssh-use-key')`  |
| Private Key textarea  | `page.locator('#ssh-key-file')` |

---

## Test Setup Pattern

All specs follow this `beforeEach` pattern (same as Feature 002):

```ts
const workspacesPage = new WorkspacesPage(page);
const connectionModal = new ConnectionModalPage(page);

test.beforeEach(async () => {
  await workspacesPage.goto();
  await workspacesPage.createWorkspace('Test Workspace');
  await workspacesPage.openWorkspace('Test Workspace');
  await connectionModal.expectModalOpen();
});
```

---

## Environment Variable Gating

Live database tests in `connection-form-live.spec.ts` follow Feature 002 pattern:

```ts
test.skip(!process.env['PG_CONNECTION'], 'PG_CONNECTION env var not set');
```

---

## Important Caveats

1. **Accordion behavior**: The SSL / SSH accordions are inside the `<Accordion type="single" collapsible>` — clicking the trigger toggles the content. The accordion trigger contains the text label plus an icon; use `page.getByText()` targeting the `<span>` text or use `.filter({ hasText })`.

2. **Switch vs Checkbox**: The SSL "Enable SSL" and SSH "Over SSH" toggles use `<Switch>` (renders as a `<button role="switch">`). Click them, not `check()`.

3. **Checkbox for SSH key auth**: "SSH Key Authentication" uses `<Checkbox>` which is a `<button role="checkbox">`. Use `.click()`.

4. **Form validation**: `isFormValid` in `useConnectionForm.ts` gates Test and Create buttons. In form mode, it requires `connectionName`, `formData.host`, `formData.port`, `formData.username`, `formData.database` to be non-empty.

5. **ConnectionForm tab is secondary**: Default tab is "Connection String". Must explicitly click "Connection Form" tab before form fields appear.

---

## File Map

| Task | File                                           | Action                             |
| ---- | ---------------------------------------------- | ---------------------------------- |
| T001 | `test/playwright/pages/ConnectionModalPage.ts` | Extend with form, SSL, SSH methods |
| T002 | `test/playwright/connection-form.spec.ts`      | Create (US1 + US2)                 |
| T003 | `test/playwright/connection-form-ssl.spec.ts`  | Create (US3)                       |
| T004 | `test/playwright/connection-form-ssh.spec.ts`  | Create (US4)                       |
| T005 | `test/playwright/connection-form-live.spec.ts` | Create (US5, env-gated)            |
| T006 | Validation                                     | Run full suite, fix failures       |
