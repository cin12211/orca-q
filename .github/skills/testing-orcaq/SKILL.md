---
name: testing-orcaq
description: >
  OrcaQ-specific testing guide. Use when asked to run, debug, or write tests
  for OrcaQ. Covers all bun test:* scripts, fixture profiles, Vitest projects
  (unit / nuxt / integration), and Playwright DB projects. Load BEFORE
  suggesting any test command so the agent uses the correct script and profile.
tools: Read, Edit, Bash, Grep, Glob
category: testing
color: blue
displayName: OrcaQ Testing
applyTo: 'test/**,scripts/test-services/**,.github/workflows/**'
---

# OrcaQ Testing — Agent Skill

> Read `docs/TESTING_GUIDE.md` for the full reference. This skill encodes the
> decision rules so you choose the right command without checking every time.

---

## 1. Decision Tree — Which Command?

```
Is the test purely logic / no DB / no browser?
  └─ YES → bun test:unit
  └─ NO →
      Is it a Vue component test (nuxt env)?
        └─ YES → bun test:nuxt
        └─ NO →
            Is it an API / server integration test?
              └─ YES →
                  Are fixtures already running?
                    └─ YES → bun test:api:raw
                    └─ NO  → bun test:api          ← auto-provisions + cleans up
              └─ NO →
                  It is a Playwright E2E test.
                  Do you need a specific DB only?
                    └─ YES → bash scripts/test-services/run-tests.sh --fixtures=<profile> -- playwright test --project <db>
                    └─ NO  → bun test:e2e          ← all fixtures, all projects
```

---

## 2. npm Script Reference

| Script                   | What it does                                    | Needs Docker? |
| ------------------------ | ----------------------------------------------- | ------------- |
| `bun test:all`           | All Vitest suites (unit + nuxt + integration)   | No            |
| `bun test:unit`          | Unit tests only (`test/unit/`)                  | No            |
| `bun test:nuxt`          | Nuxt component tests (`test/nuxt/`)             | No            |
| `bun test:api`           | Integration tests — auto starts all fixtures    | Yes           |
| `bun test:api:raw`       | Integration tests — fixtures must already be up | Yes           |
| `bun test:e2e`           | Playwright — auto starts all fixtures           | Yes           |
| `bun test:e2e:raw`       | Playwright — fixtures must already be up        | Yes           |
| `bun test:coverage`      | Full coverage report                            | No            |
| `bun test:watch`         | Watch mode (development)                        | No            |
| `bun test:fixtures:up`   | Start all Docker fixtures                       | Yes           |
| `bun test:fixtures:down` | Stop and remove all Docker fixtures             | Yes           |

---

## 3. Vitest Projects

| Project flag            | Files                           | Notes                    |
| ----------------------- | ------------------------------- | ------------------------ |
| `--project unit`        | `test/unit/**/*.{test,spec}.ts` | Pure logic, no framework |
| `--project nuxt`        | `test/nuxt/**/*.{test,spec}.ts` | Vue component tests      |
| `--project integration` | `test/api/**/*.{test,spec}.ts`  | Requires all DB fixtures |

Run one file:

```bash
bun vitest --run test/unit/core/helpers/myHelper.spec.ts
```

---

## 4. Playwright Projects & Fixture Profiles

| Playwright project | Fixture profile to use             |
| ------------------ | ---------------------------------- |
| `common`           | `all`                              |
| `postgres`         | `postgres`                         |
| `mysql`            | `mysql`                            |
| `mariadb`          | `mariadb`                          |
| `redis`            | `redis`                            |
| `sqlite`           | `sqlite`                           |
| `oracle`           | manual (no Docker compose profile) |

Run isolated by DB:

```bash
bash scripts/test-services/run-tests.sh --fixtures=postgres -- playwright test --project postgres
bash scripts/test-services/run-tests.sh --fixtures=redis   -- playwright test --project redis
bash scripts/test-services/run-tests.sh --fixtures=sqlite  -- playwright test --project sqlite
```

---

## 5. Fixture Profile Reference

| Profile    | Containers started           |
| ---------- | ---------------------------- |
| `postgres` | PostgreSQL 16 only           |
| `mysql`    | MySQL 8.4 only               |
| `mariadb`  | MariaDB 11.4 only            |
| `sql`      | PostgreSQL + MySQL + MariaDB |
| `redis`    | Redis 7.4 only               |
| `sqlite`   | File prep only (no Docker)   |
| `all`      | All of the above             |
| `none`     | Nothing                      |

Manual fixture control:

```bash
bash scripts/test-services/start-fixtures.sh --profile <profile>
bash scripts/test-services/stop-fixtures.sh  --profile <profile>
```

---

## 6. Key Env Vars

All use `ORCAQ_` prefix. Defaults are set by `start-fixtures.sh` automatically.

```
ORCAQ_POSTGRES_PORT=5432      ORCAQ_POSTGRES_DATABASE=pagila
ORCAQ_MYSQL_PORT=3306         ORCAQ_MYSQL_DATABASE=sakila
ORCAQ_MARIADB_PORT=3307       ORCAQ_MARIADB_DATABASE=sakila
ORCAQ_REDIS_PORT=6379
ORCAQ_KEEP_FIXTURES=1         # keep containers alive after run
ORCAQ_FIXTURE_PROFILE=all     # override profile via env
```

---

## 7. Fast Iteration Pattern

When iterating on integration or E2E tests, start fixtures once and reuse:

```bash
bun test:fixtures:up           # 1× — start all containers
bun test:api:raw               # run repeatedly
# or
bun test:e2e:raw               # run repeatedly
bun test:fixtures:down         # done
```

---

## 8. Rules the Agent Must Follow

1. **Never run `test:api` or `test:e2e` when fixtures are already up** — use the `:raw` variant to avoid double-provisioning.
2. **Never start all fixtures to test a single DB** — use the matching profile.
3. **Always run `bun test:unit` after any source change** to verify no regression before running heavier suites.
4. **Do not run `bun test:all`** for a change scoped to one DB — pick the narrowest relevant suite.
5. **Use `ORCAQ_KEEP_FIXTURES=1`** when debugging flaky tests so containers survive after failure.
