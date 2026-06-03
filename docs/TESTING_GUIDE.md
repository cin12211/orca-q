# Testing Guide — OrcaQ

> All test commands use **Bun** as the task runner. Replace `bun` with `npm run` or `npx` if needed.

---

## Quick Reference

| Goal                                             | Command                  |
| ------------------------------------------------ | ------------------------ |
| Run all Vitest suites                            | `bun test:all`           |
| Unit tests only                                  | `bun test:unit`          |
| Nuxt component tests                             | `bun test:nuxt`          |
| API/integration tests (with auto fixtures)       | `bun test:api`           |
| API/integration tests (fixtures already running) | `bun test:api:raw`       |
| Playwright E2E (with auto fixtures)              | `bun test:e2e`           |
| Playwright E2E (fixtures already running)        | `bun test:e2e:raw`       |
| Coverage report                                  | `bun test:coverage`      |
| Watch mode                                       | `bun test:watch`         |
| Start all fixtures manually                      | `bun test:fixtures:up`   |
| Stop all fixtures manually                       | `bun test:fixtures:down` |

---

## Test Architecture

### Vitest — Three Projects

| Project name  | Path                            | Needs fixtures? |
| ------------- | ------------------------------- | --------------- |
| `unit`        | `test/unit/**/*.{test,spec}.ts` | No              |
| `nuxt`        | `test/nuxt/**/*.{test,spec}.ts` | No              |
| `integration` | `test/api/**/*.{test,spec}.ts`  | Yes — all DBs   |

**Run a single Vitest project:**

```bash
bun vitest --run --project unit
bun vitest --run --project nuxt
bun vitest --run --project integration  # requires fixtures
```

**Run a specific test file:**

```bash
bun vitest --run test/unit/core/helpers/deepUnRef.spec.ts
```

### Playwright — Seven Projects

| Project name | DB required        |
| ------------ | ------------------ |
| `common`     | all                |
| `postgres`   | PostgreSQL         |
| `mysql`      | MySQL              |
| `mariadb`    | MariaDB            |
| `oracle`     | Oracle             |
| `redis`      | Redis              |
| `sqlite`     | SQLite (no Docker) |

**Run a single Playwright project:**

```bash
# Auto-provisions only the required fixtures, then cleans up
bash scripts/test-services/run-tests.sh --fixtures=postgres -- playwright test --project postgres
bash scripts/test-services/run-tests.sh --fixtures=mysql   -- playwright test --project mysql
bash scripts/test-services/run-tests.sh --fixtures=redis   -- playwright test --project redis
bash scripts/test-services/run-tests.sh --fixtures=sqlite  -- playwright test --project sqlite
bash scripts/test-services/run-tests.sh --fixtures=all     -- playwright test --project common
```

> The wrapper script (`run-tests.sh`) automatically adds `node_modules/.bin` to `PATH`,
> so `playwright` resolves correctly. When calling `bun test:e2e:raw` or `bun test:e2e`,
> Bun handles PATH resolution on its own.

**Run a specific spec file (fixtures already up):**

```bash
bunx playwright test test/e2e/postgres/table-browser.spec.ts
```

---

## Fixture Management

Fixtures are Docker containers (PostgreSQL 16, MySQL 8.4, MariaDB 11.4, Redis 7.4) plus SQLite file preparation.

### Profiles

| Profile    | What starts                  |
| ---------- | ---------------------------- |
| `postgres` | PostgreSQL only              |
| `mysql`    | MySQL only                   |
| `mariadb`  | MariaDB only                 |
| `sql`      | PostgreSQL + MySQL + MariaDB |
| `redis`    | Redis only                   |
| `sqlite`   | SQLite prep only (no Docker) |
| `all`      | Everything above             |
| `none`     | Nothing — fixtures skipped   |

### Manual fixture control

```bash
# Start a profile
bash scripts/test-services/start-fixtures.sh --profile postgres
bash scripts/test-services/start-fixtures.sh --profile all

# Stop a profile
bash scripts/test-services/stop-fixtures.sh --profile postgres
bash scripts/test-services/stop-fixtures.sh --profile all

# Or use the npm scripts (always runs "all" profile)
bun test:fixtures:up
bun test:fixtures:down
```

### Auto-provisioning wrapper

`run-tests.sh` starts fixtures before the command, then stops them after — even on failure:

```bash
bash scripts/test-services/run-tests.sh --fixtures=<profile> -- <command>

# Keep containers alive after the run (useful for debugging)
ORCAQ_KEEP_FIXTURES=1 bash scripts/test-services/run-tests.sh --fixtures=postgres -- playwright test --project postgres
```

---

## Environment Variables

All fixture env vars use the `ORCAQ_` prefix. Defaults are set automatically when fixtures start.

| Variable                  | Default  | Description                               |
| ------------------------- | -------- | ----------------------------------------- |
| `ORCAQ_POSTGRES_PORT`     | `5432`   | PostgreSQL port                           |
| `ORCAQ_POSTGRES_DATABASE` | `pagila` | Default database                          |
| `ORCAQ_POSTGRES_USER`     | `orcaq`  | Username                                  |
| `ORCAQ_POSTGRES_PASSWORD` | `orcaq`  | Password                                  |
| `ORCAQ_MYSQL_PORT`        | `3306`   | MySQL port                                |
| `ORCAQ_MYSQL_DATABASE`    | `sakila` | Default database                          |
| `ORCAQ_MYSQL_USER`        | `orcaq`  | Username                                  |
| `ORCAQ_MYSQL_PASSWORD`    | `orcaq`  | Password                                  |
| `ORCAQ_MARIADB_PORT`      | `3307`   | MariaDB port                              |
| `ORCAQ_MARIADB_DATABASE`  | `sakila` | Default database                          |
| `ORCAQ_MARIADB_USER`      | `orcaq`  | Username                                  |
| `ORCAQ_MARIADB_PASSWORD`  | `orcaq`  | Password                                  |
| `ORCAQ_REDIS_PORT`        | `6379`   | Redis port                                |
| `ORCAQ_KEEP_FIXTURES`     | unset    | Set to `1` to keep containers after a run |
| `ORCAQ_FIXTURE_PROFILE`   | `all`    | Override fixture profile via env          |

Override any value inline:

```bash
ORCAQ_POSTGRES_PORT=5433 bun test:api
```

### Default Connection Strings

When running locally with the default fixture setup, you can connect to the databases using the following full connection strings:

| Database       | Connection String / File Path                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL** | `postgresql://orcaq:orcaq@127.0.0.1:5432/pagila`                                                                                                                     |
| **MySQL**      | `mysql://orcaq:orcaq@127.0.0.1:3306/sakila`                                                                                                                          |
| **MariaDB**    | `mysql://orcaq:orcaq@127.0.0.1:3307/sakila` (Note: Uses `mysql` protocol)                                                                                            |
| **Redis**      | `redis://127.0.0.1:6379/0`                                                                                                                                           |
| **SQLite**     | `test/fixtures/datasets/.tmp/sqlite/sakila.sqlite` (Relative to repo root)<br>Or absolute: `sqlite:///path/to/repo/test/fixtures/datasets/.tmp/sqlite/sakila.sqlite` |

For external/live databases (enabled when environment variables are set):

| Database / Provider | Connection String Pattern                                      | Configuration Env Vars / Details                  |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------- |
| **Oracle**          | `oracledb://<username>:<password>@<host>:<port>/<serviceName>` | `ORACLE_CONNECTION` or `ORCAQ_ORACLE_URL`         |
| **Cloudflare D1**   | _Managed SQLite Client API_                                    | `D1_ACCOUNT_ID`, `D1_DATABASE_ID`, `D1_API_TOKEN` |
| **Turso**           | `libsql://<host>`                                              | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`          |

---

## CI/CD

| Workflow         | Trigger      | What it runs                                     |
| ---------------- | ------------ | ------------------------------------------------ |
| `unit-tests.yml` | push / PR    | `test:unit` + `test:nuxt`                        |
| `api-tests.yml`  | PR to main   | `test:api:raw` (provisions fixtures in job)      |
| `e2e.yml`        | push to main | One job per DB, each starts only its own fixture |

Each CI E2E job starts only the fixture it needs:

```yaml
# e.g. e2e-postgres job
- bash scripts/test-services/start-fixtures.sh --profile postgres
- playwright test --project postgres
- bash scripts/test-services/stop-fixtures.sh --profile postgres
```

---

## Troubleshooting

**Fixtures not ready — timeout**

```bash
# Inspect container logs
docker compose -p orcaq-sql-fixtures -f test/fixtures/containers/sql-services.compose.yml logs postgres
```

**Port conflict**

```bash
# Stop all running fixtures first
bun test:fixtures:down
# Then use custom ports
ORCAQ_POSTGRES_PORT=5433 bun test:api
```

**Run integration tests without tearing down fixtures (fast iteration)**

```bash
bun test:fixtures:up          # once
bun test:api:raw              # run as many times as needed
bun test:fixtures:down        # cleanup when done
```

**Playwright debug mode**

```bash
PWDEBUG=1 bunx playwright test --project postgres test/e2e/postgres/my-test.spec.ts
```
