# SSH/SSL Connection Flow Audit

Date: 2026-06-06

## Scope

Review the connection flows that should support SSH tunnel and SSL:

- Create/edit connection modal health check.
- Saved connection params shared by quick query, raw query, metadata, schema, ERD, table, and instance-insights APIs.
- Runtime adapter resolution through `getDatabaseSource`.
- MySQL behavior when the server requires secure transport.

## Findings

### 1. SSH/SSL only works for form-based SQL connections

`useConnectionForm` builds SSH and SSL config in `buildFormConnectionPayload`, then uses that payload only when the selected method is `FORM`.

- `components/modules/connection/hooks/useConnectionForm.ts:197` builds SSL config.
- `components/modules/connection/hooks/useConnectionForm.ts:211` builds SSH config.
- `components/modules/connection/hooks/useConnectionForm.ts:231` attaches both configs to form payload.
- `components/modules/connection/hooks/useConnectionForm.ts:294` returns string health-check payload without SSH/SSL.
- `components/modules/connection/hooks/useConnectionForm.ts:439` stores string connections without SSH/SSL.
- `components/modules/connection/hooks/useConnectionForm.ts:461` stores SSH/SSL only for form connections.

Impact:

- A connection created with the "Connection String" tab cannot use SSH/SSL.
- A MySQL URL like `mysql://user:pass@127.0.0.1:3306/db` will be used directly.
- This matches the observed error `ECONNREFUSED 127.0.0.1:3306` when SSH was expected, because no tunnel is created for string mode.

### 2. Health-check backend explicitly bypasses SSH/SSL in string mode

`resolveHealthCheckConnection` receives `ssl` and `ssh`, but its string-method branch returns the URL unchanged before tunnel or SSL object construction.

- `server/infrastructure/driver/db-connection.ts:181` handles `EConnectionMethod.STRING`.
- `server/infrastructure/driver/db-connection.ts:188` returns `connection: url`.
- `server/infrastructure/driver/db-connection.ts:239` creates SSH tunnel only after the string branch.
- `server/infrastructure/driver/db-connection.ts:260` adds SSL only after the string branch.

Impact:

- Health check can only apply SSH/SSL for `FORM`.
- For string health-check, SSL must be encoded in the URL itself, and SSH cannot be represented at all.
- The MySQL error `Connections using insecure transport are prohibited while --require_secure_transport=ON` is expected if the string URL lacks a valid MySQL SSL option.

### 3. Runtime adapter resolution has the same string-mode bypass

Most feature APIs eventually resolve adapters through `getDatabaseSource`. That function chooses `STRING` mode whenever `dbConnectionString` is present, and the tunnel/SSL construction only runs in the `!dbConnectionString && host` branch.

- `core/helpers/connection-helper.ts:8` sends `dbConnectionString` only for string connections.
- `core/helpers/connection-helper.ts:22` also passes `ssl`.
- `core/helpers/connection-helper.ts:23` also passes `ssh`.
- `server/infrastructure/driver/db-connection.ts:326` selects `STRING` when `dbConnectionString` exists.
- `server/infrastructure/driver/db-connection.ts:340` initializes `finalConnection` directly from the string.
- `server/infrastructure/driver/db-connection.ts:361` applies host/port, SSH, and SSL only when no `dbConnectionString` exists.

Impact:

- Saved form connections with host/user/password can use SSH/SSL through `getConnectionParams`.
- Saved string connections cannot use SSH/SSL through quick query, metadata, schema browsing, ERD, instance insights, table actions, or other adapter-backed flows.

### 4. Raw query drops SSH/SSL in specific branches

Raw query has additional bypasses that can drop network options even before the server receives the request.

- `components/modules/raw-query/hooks/useQueryExecution.ts:295` EXPLAIN branch calls `/api/query/raw-execute`.
- `components/modules/raw-query/hooks/useQueryExecution.ts:298` sends only `dbConnectionString`.
- `components/modules/raw-query/hooks/useQueryExecution.ts:352` streaming branch calls `executeStreamingQuery`.
- `components/modules/raw-query/hooks/useQueryExecution.ts:354` sends only `dbConnectionString`.
- `components/modules/raw-query/hooks/useStreamingQuery.ts:77` has no `ssl`/`ssh` input.
- `components/modules/raw-query/hooks/useStreamingQuery.ts:93` serializes no `ssl`/`ssh`.

Impact:

- Raw query may fail for SSH/SSL connections even if other `getConnectionParams`-based flows work.
- This is a separate bug from string-mode adapter resolution.

### 5. Tunnel lifecycle can leave stale shared tunnels

`createSshTunnel` reuses active tunnels by key, but reused tunnel close is a no-op.

- `server/utils/ssh-tunnel.ts:24` reuses existing tunnels.
- `server/utils/ssh-tunnel.ts:29` returns a no-op close function.
- `server/utils/ssh-tunnel.ts:60` closes only the original tunnel owner.

Impact:

- Health checks create and close their own tunnel when no shared tunnel exists.
- A cached adapter can keep an SSH tunnel open for five minutes.
- Reused tunnel lifecycle has no ref-counting, so future changes should avoid closing a shared tunnel too early, and should handle stale/dead tunnel entries.

## Current Status

Form SQL connection with SSH/SSL:

- Backend path exists and should create a local tunnel before connecting.
- SSL object is attached to the driver connection when `ssl.mode !== 'disable'`.
- Needs a live MySQL/Postgres SSH+SSL fixture or manual target to fully verify.

String SQL connection with SSH/SSL:

- Not supported by the current implementation.
- UI/state does not persist SSH/SSL for string connections.
- Backend health-check and runtime adapter resolution ignore SSH/SSL for string connections.

MySQL with `require_secure_transport=ON`:

- Expected to fail when SSL config is absent or not encoded correctly.
- Form mode can pass SSL object to mysql2/knex.
- String mode depends entirely on URL-level SSL support and currently cannot combine with SSH.

Redis:

- Redis has a separate runtime path that passes `ssl` and `ssh` into `pingRedisConnection`.
- Not the source of the MySQL errors shown in the log.

## Recommended Fix Plan

1. Define the product contract for SSH/SSL + connection string.
   - Option A: support SSH/SSL only in form mode and hide/disable those controls outside form mode.
   - Option B: support SSH/SSL for string mode by parsing URLs into structured connection objects server-side.
   - Recommended: Option B for parity, because users often receive DB URLs from managed providers.

2. Introduce one shared resolver for SQL connection targets.
   - Parse connection strings into `{ host, port, user, password, database }` when `ssh.enabled` or external SSL config is present.
   - Apply SSH tunnel before adapter creation.
   - Apply SSL config after SSH tunnel resolution.
   - Reuse the resolver from both `resolveHealthCheckConnection` and `getDatabaseSource`.

3. Normalize MySQL SSL behavior.
   - For MySQL/MariaDB, map SSL modes explicitly:
     - `require`/`preferred`: `ssl: { rejectUnauthorized: false }` unless CA verification is requested.
     - `verify-ca`/`verify-full`: require CA and keep `rejectUnauthorized: true`.
   - Preserve cert/key support.
   - Avoid silently sending empty CA/cert/key values.

4. Fix raw query payloads.
   - Use `getConnectionParams(connection.value)` in EXPLAIN and streaming branches.
   - Extend `executeStreamingQuery` to accept and serialize host/user/database/SSL/SSH params, not only `dbConnectionString`.

5. Improve SSH tunnel management.
   - Add validation for missing SSH host/username/auth material before attempting connection.
   - Add timeout/error propagation for SSH connect and forwardOut failures.
   - Replace no-op shared tunnel close with reference counting or health validation.

## Verification Checklist

- [ ] Unit: `useConnectionForm` builds and stores SSL/SSH for supported methods according to the chosen product contract.
- [ ] Unit: health-check route forwards SSL/SSH for MySQL form and string payloads.
- [ ] Unit: `resolveHealthCheckConnection` creates a tunnel before adapter creation when SSH is enabled.
- [ ] Unit: `getDatabaseSource` applies SSH/SSL when given string connection plus network options.
- [ ] Unit: raw query EXPLAIN and streaming payloads include SSL/SSH.
- [ ] Integration: MySQL direct form connection succeeds without SSL when `require_secure_transport=OFF`.
- [ ] Integration: MySQL direct form connection fails with clear message when `require_secure_transport=ON` and SSL disabled.
- [ ] Integration: MySQL direct form connection succeeds with SSL `require` when `require_secure_transport=ON`.
- [ ] Integration/manual: MySQL over SSH succeeds without DB host reachable from the app host.
- [ ] Integration/manual: MySQL over SSH + SSL succeeds when `require_secure_transport=ON`.
- [ ] Regression: quick query, raw query streaming, metadata browsing, ERD, and instance insights all use the same connection params.

## Commands Run

```bash
bun vitest --run test/unit/server/api/managment-connection/health-check.spec.ts test/nuxt/components/modules/connection/hooks/useConnectionForm.test.ts
```

Result:

- Passed: 48 tests, 2 files.
- Existing stderr warnings were unrelated to this audit: localforage storage hydration warning and missing Amplitude API key in test env.

## Open Questions

- Should the UI expose SSH/SSL for connection-string mode, or should connection-string mode be documented as direct-only?
- Should saved form connections keep generating `connection.connectionString`, or should downstream APIs prefer structured params whenever available?
- Does the production MySQL SSL target require CA verification, or is encrypted transport without certificate verification acceptable for the first fix?
