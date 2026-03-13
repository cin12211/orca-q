# Tasks: Connection Form E2E Tests (SSH + SSL)

**Feature**: 003-connection-form-e2e  
**Branch**: `003-connection-form-e2e`  
**Created**: 2026-03-13  
**Plan**: [plan.md](./plan.md)

---

## Phase 1 — POM Extension

### T001 — Extend ConnectionModalPage with Form / SSL / SSH methods

- **File**: `test/playwright/pages/ConnectionModalPage.ts`
- **Action**: Add `selectFormTab()`, form field locators (host, port, username, password, database), SSL accordion methods, SSH accordion methods
- **Status**: [X] — Added `selectConnectionFormTab()`, all form/SSL/SSH locators, `fillFormCredentials()`, `expandSslAccordion()`, `enableSsl()`, `expandSshAccordion()`, `enableSsh()`, `enableSshKeyAuth()`

---

## Phase 2 — Test Files

### T002 — Create connection-form.spec.ts (US1 + US2)

- **File**: `test/playwright/connection-form.spec.ts`
- **Action**: Write tests for form tab rendering (US1) and full form-based connection creation (US2)
- **Depends on**: T001
- **Status**: [X] — 11 tests, all passed

### T003 — Create connection-form-ssl.spec.ts (US3)

- **File**: `test/playwright/connection-form-ssl.spec.ts`
- **Action**: Write tests for SSL accordion expansion, toggle, mode selection, and certificate fields
- **Depends on**: T001
- **Status**: [X] — 7 tests, all passed

### T004 — Create connection-form-ssh.spec.ts (US4)

- **File**: `test/playwright/connection-form-ssh.spec.ts`
- **Action**: Write tests for SSH accordion expansion, toggle, field entry, SSH key auth checkbox and private key textarea
- **Depends on**: T001
- **Status**: [X] — 8 tests, all passed

### T005 — Create connection-form-live.spec.ts (US5)

- **File**: `test/playwright/connection-form-live.spec.ts`
- **Action**: Write combined form+SSL+SSH live test gated behind `PG_CONNECTION` env var
- **Depends on**: T001
- **Status**: [X] — 1 passed (UI), 4 skipped (PG_CONNECTION not set)

---

## Phase 3 — Validation

### T006 — Run full Playwright suite and fix failures

- **Command**: `bunx playwright test --workers=1`
- **Acceptance**: All new tests pass or skip (for env-gated tests); existing 21 tests continue to pass
- **Status**: [X] — **48 passed, 7 skipped, 0 failed** (2.1 min)

---

## Summary

| Task | Description                        | Status |
| ---- | ---------------------------------- | ------ |
| T001 | Extend ConnectionModalPage POM     | [X]    |
| T002 | connection-form.spec.ts (US1+US2)  | [X]    |
| T003 | connection-form-ssl.spec.ts (US3)  | [X]    |
| T004 | connection-form-ssh.spec.ts (US4)  | [X]    |
| T005 | connection-form-live.spec.ts (US5) | [X]    |
| T006 | Validate full suite                | [X]    |
