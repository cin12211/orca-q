# Test Infrastructure Refactor

## Problem Statement

1. **Too many scripts** — `package.json` has 50+ test scripts with duplicates (`test:e2e:*` / `test:playwright:*` / `test:db-matrix:*`) making it confusing.
2. **Wrong fixture provisioning** — Running `test:e2e:postgres` spins up ALL SQL containers (postgres + mysql + mariadb) instead of only postgres. Wastes time and resources.
3. **Legacy `HERAQ_*` env vars** — Docker compose files and shell scripts still export `HERAQ_*` variables. Should be `ORCAQ_*` only.
4. **No API test in PR CI** — Current PR workflow only runs unit tests. API/integration tests are not triggered on PRs.
5. **API tests don't self-provision** — API tests require manually starting fixtures before running.

## Goals

- Reduce test scripts from 50+ to ~15 clean, orthogonal scripts
- Support per-DB isolated fixture provisioning: `--fixtures=postgres`, `--fixtures=mysql`, `--fixtures=redis`, etc.
- Rename all `HERAQ_*` to `ORCAQ_*` (remove legacy fallback)
- Add `api-tests.yml` CI workflow triggered on PRs
- API tests auto-provision their fixtures via the same `run-e2e-tests.sh` mechanism
- CI jobs start only the fixtures they need (postgres job → only postgres container)

---

## Design

### 1. Simplified `package.json` Scripts

```
"test:unit"        → vitest --run --project unit
"test:nuxt"        → vitest --run --project nuxt
"test:api"         → bash scripts/test-services/run-tests.sh --fixtures=auto vitest --run --project integration
"test:api:raw"     → vitest --run --project integration
"test:e2e"         → bash scripts/test-services/run-tests.sh --fixtures=all playwright test
"test:e2e:raw"     → playwright test
"test:all"         → vitest --run
"test:coverage"    → vitest run --coverage
"test:watch"       → vitest --watch
"test:fixtures:up" → bash scripts/test-services/start-fixtures.sh
"test:fixtures:down" → bash scripts/test-services/stop-fixtures.sh
```

**Isolated runs via env or flags (no extra scripts):**

```bash
# Local dev — run just postgres playwright tests
bun test:e2e:raw -- --project postgres   # if fixtures already running

# With auto-fixture provisioning
ORCAQ_FIXTURE_PROFILE=postgres bun test:e2e

# Or using the flag
bash scripts/test-services/run-tests.sh --fixtures=postgres -- playwright test --project postgres
```

### 2. Fixture Profiles (Extended)

Current profiles: `none`, `redis`, `sql`, `all`

New profiles:
| Profile | Starts |
|------------|------------------------------|
| `none` | Nothing |
| `postgres` | Only PostgreSQL container |
| `mysql` | Only MySQL container |
| `mariadb` | Only MariaDB container |
| `sql` | postgres + mysql + mariadb |
| `redis` | Only Redis container |
| `sqlite` | Builds SQLite file (no docker)|
| `all` | sql + redis + sqlite |
| `auto` | Detects from test file paths |

**Auto-detection logic** (for API tests): inspects test file paths → if `test/api/pg/` → needs postgres, `test/api/redis/` → needs redis, etc.

### 3. Docker Compose Split

Split `sql-services.compose.yml` into per-service compose files that can be composed together:

```
test/fixtures/containers/
├── postgres.compose.yml     ← only postgres
├── mysql.compose.yml        ← only mysql + mariadb (same schema)
├── redis.compose.yml        ← only redis (rename from nosql-services)
└── sql-services.compose.yml ← REMOVED (replaced by individual files)
```

Actually, simpler approach: use `docker compose` profiles:

```yaml
# sql-services.compose.yml
services:
  postgres:
    profiles: [postgres, sql, all]
    ...
  mysql:
    profiles: [mysql, sql, all]
    ...
  mariadb:
    profiles: [mariadb, sql, all]
    ...
```

Then: `docker compose --profile postgres up -d` starts only postgres.

### 4. Env Variable Migration

Remove all `HERAQ_*` references. Change docker-compose to use `ORCAQ_*` directly:

```yaml
# Before
'${HERAQ_POSTGRES_PORT:-5432}'

# After
'${ORCAQ_POSTGRES_PORT:-5432}'
```

Shell scripts: remove the dual-resolution pattern (`ORCAQ_*` falls back to `HERAQ_*`). Use `ORCAQ_*` directly with defaults.

### 5. CI/CD Changes

#### New workflow: `.github/workflows/api-tests.yml`

- Triggered on `pull_request` to `main`
- Provisions postgres + redis fixtures
- Runs `bun test:api:raw`

#### Updated: `.github/workflows/e2e.yml`

- `e2e-postgres` starts ONLY postgres (not all SQL)
- `e2e-mysql` starts ONLY mysql
- `e2e-mariadb` starts ONLY mariadb
- `e2e-redis` — already correct (redis only)
- `e2e-common` — starts all (needs all for cross-DB tests)

### 6. Updated `run-tests.sh` (renamed from `run-e2e-tests.sh`)

More generic name since it handles both API and E2E tests now. Supports:

- `--fixtures=<profile>` — which containers to start
- Remaining args → the test command to run
- Auto-cleanup on exit (unless `ORCAQ_KEEP_FIXTURES=1`)

---

## Tasks

### Phase 1: Infrastructure Scripts

- [ ] 1.1 Add docker compose profiles to `sql-services.compose.yml`
- [ ] 1.2 Rename `HERAQ_*` to `ORCAQ_*` in all compose files and scripts
- [ ] 1.3 Rewrite `start-sql-fixtures.sh` to accept a `--profile` flag (or use `ORCAQ_FIXTURE_PROFILE`)
- [ ] 1.4 Rename `run-e2e-tests.sh` → `run-tests.sh`, add per-DB profile support
- [ ] 1.5 Update `stop-sql-fixtures.sh` / `stop-nosql-fixtures.sh` accordingly
- [ ] 1.6 Create unified `start-fixtures.sh` / `stop-fixtures.sh` that dispatches based on profile

### Phase 2: package.json Cleanup

- [ ] 2.1 Remove all duplicate/redundant test scripts
- [ ] 2.2 Implement the simplified script set

### Phase 3: CI/CD

- [ ] 3.1 Create `.github/workflows/api-tests.yml`
- [ ] 3.2 Update `.github/workflows/e2e.yml` — each DB job starts only its own fixtures
- [ ] 3.3 Update `.github/workflows/unit-tests.yml` to also call nuxt tests (optional)

### Phase 4: Cleanup

- [ ] 4.1 Remove `HERAQ_*` fallback from `db-fixtures.ts`
- [ ] 4.2 Update docs/README references
- [ ] 4.3 Verify all tests pass with new scripts

---

## Migration Notes

- Old scripts like `bun test:e2e:postgres` still work via: `ORCAQ_FIXTURE_PROFILE=postgres bun test:e2e -- --project postgres`
- The `test:e2e:raw` / `test:api:raw` variants remain for when fixtures are already running (fast local iteration)
