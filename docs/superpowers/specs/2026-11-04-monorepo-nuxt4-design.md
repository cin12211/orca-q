# Monorepo + Nuxt 4 restructure — design & plan

Date: 2026-11-04 · Baseline: `HEAD 36cd89de` (Nuxt `^3.16.2`, single-package repo)

## Intent

OrcaQ ships one Nuxt build three ways: web (`nuxt build`), desktop (Electron spawns the
Nitro server as a sidecar and `loadURL`s it) and CLI (`npx-package`, which copies `.output`
and spawns `server/index.mjs`). Everything lives at the repo root, so the three products
have no visible boundary, and the Nuxt 3 directory layout has drifted (server code imports
`~/core/**` and even `~/components/modules/**`).

This change:

1. Turns the repo into a monorepo with three apps: `apps/web`, `apps/desktop`, `apps/cli`.
2. Upgrades Nuxt to **4.6.4** and lays `apps/web` out the Nuxt 4 way (`app/`, `server/`,
   `shared/`), splitting `core/` by who uses it.

## Goals

- Clear app boundaries: web / desktop / cli each own their `package.json`, scripts, config.
- `apps/web` follows Nuxt 4 conventions exactly: client code in `app/`, Nitro in `server/`,
  code used by both in `shared/` (imported via `#shared/...`). Server code never imports `app/`.
- Same runtime behavior for all three products.

## Non-goals (decided by user)

- No `packages/ui` or `packages/core` yet. `core/` and UI stay inside `apps/web`.
- Electron stays a thin wrapper around the `apps/web` build. CLI stays the npx launcher.
- No feature or behavior changes.

## Anti-goals

- Broken desktop or npx build after the move, even if web dev works.
- Losing local dev data (`.sqlite3/orcaq.db`).
- Running `git add` / `git mv` / commits — the user stages and commits themselves. Move files
  with plain `mv`. Never `git stash` without `pop --index`.

## Decided layout

```
/                         package.json (private, workspaces ["apps/*"], proxy scripts)
                          bun.lock, .husky, .prettierrc, .github, docs, graphify-out,
                          Dockerfile, docker-compose.yml, SAC/, .dependency-cruiser.js
apps/web/                 package.json (name "@orcaq/web"), nuxt.config.ts, tsconfig.json,
                          vitest.config.ts, playwright.config.ts, components.json,
                          tailwind.config.ts, .env*, .storybook/, public/, test/,
                          scripts/test-services/ , ecosystem.config.js
  app/                    app.vue, error.vue, spa-loading-template.html, assets/, components/,
                          layouts/, middleware/, pages/, plugins/, lib/,
                          core/  (client-only remainder: stores, composables, contexts, ...)
  server/                 unchanged contents
  shared/                 types, constants, helpers, sql-dialect, and any module
                          types/utils the server needs (moved out of components/modules)
  types/                  ambient *.d.ts (electron-api.d.ts, oracledb.d.ts)
apps/desktop/             package.json ("@orcaq/desktop", main "out/electron/main.js"),
                          electron/ sources, electron-builder.yml,
                          scripts/electron-before-build.mjs, scripts/electron-compile-dev.mjs
apps/cli/                 former npx-package/ (published name stays "orcaq"),
                          scripts/build-npx.mjs
```

## Plan (phases run in order; each must end green)

### Phase 1 — monorepo skeleton (still Nuxt 3)

- Bun workspaces only, no Turborepo (builder's call: fewest moving parts).
- Move the whole Nuxt app into `apps/web` with today's flat layout. Move `electron/`,
  `electron-builder.yml` and electron scripts into `apps/desktop`; `npx-package/` into `apps/cli`.
- Split dependencies: electron, electron-builder, electron-log/store/updater, wait-on,
  concurrently → desktop; commander → cli; everything else → web. Shared dev tooling
  (prettier, husky, typescript) may stay at root.
- Native modules: keep `electron-builder install-app-deps` behavior (now in desktop's postinstall).
- Fix every path: before-build copies `apps/web/.output` → `apps/desktop/out/runtime`;
  `build-npx` copies `apps/web/.output` → `apps/cli/.output`; electron `tsconfig`, sidecar paths,
  `electron-builder.yml` `files`/`extraResources`; `sync-version.mjs` updates all package.json.
- Dev DB: `electron:dev` keeps using repo-root `.sqlite3/orcaq.db` (pass an absolute or
  `../../.sqlite3/...` path). Do not delete or move `.sqlite3/`.
- Root `package.json` keeps every current script name (`dev`, `typecheck`, `test:unit`,
  `test:nuxt`, `test:api*`, `test:e2e*`, `electron:*`, `npx:*`, `storybook`, `format*`,
  `version:*`) as proxies, so documented commands still work from the root.
- Gitignored build dirs (`.nuxt`, `.output`, `out`, `test-results`, ...) are not moved; they regenerate.
- Done: `bun install`, `bun run typecheck`, `bun test:unit` match baseline; `bun run npx:build`
  and `node apps/desktop/scripts/electron-before-build.mjs` succeed.

### Phase 2 — Nuxt 4.6.4 + Nuxt 4 layout

- Read the official Nuxt 4 upgrade guide (context7 / nuxt.com/docs/getting-started/upgrade).
  Bump `nuxt` to `4.6.4` and Nuxt-ecosystem modules to versions compatible with Nuxt 4
  (`@nuxt/test-utils`, `@nuxt/icon`, `@pinia/nuxt`, `pinia-plugin-persistedstate`,
  `nuxt-typed-router`, `shadcn-nuxt`, `@nuxtjs/color-mode`, ...). Drop `nuxt-icon` if unused.
- Move client code into `apps/web/app/`. Update `nuxt.config.ts` (`shadcn.componentDir`,
  `css`, `icon.customCollections.dir`, `imports.dirs`, `components.dirs`, `watch`, `ignore`),
  `components.json`, vitest aliases, tsconfig (use Nuxt 4 generated project references),
  storybook config.
- Split `core/`: anything imported by `server/` or `apps/desktop/electron` goes to `shared/`
  (at least `types`, `constants`, `helpers`, `sql-dialect`; decide `persist`/`storage` by reading
  them — if a file is used by both, it must be environment-neutral or be split). The rest stays in
  `app/core/`. Move the ~15 types/utils the server imports from `components/modules/**` into
  `shared/` too, and re-point the client imports.
- Imports: client `~/core/...` stays valid for `app/core`; shared code is imported as
  `#shared/...` everywhere (client, server, electron). `shared/` code must not import `app/`
  or `server/`. Electron tsconfig gets a path mapping for the shared files it uses.
- Fix Nuxt 4 behavior changes surfaced by typecheck/tests (data fetching defaults, `useAsyncData`
  `data` defaults to `undefined`, typed `useRoute`, etc.). Keep behavior identical.
- Done: phase-1 checks plus `bun test:nuxt` match baseline, and `bun run dev` serves the app.

### Phase 3 — docs, CI, Docker (can run alongside phase 2; uses the layout above)

- `.github/workflows/*`, `Dockerfile` (build in `apps/web`, copy `apps/web/.output`),
  `docker-compose.yml`, `SAC/`, `.dependency-cruiser.js` + `depcruise:json` paths,
  `.prettierignore`, `.gitignore`.
- `CLAUDE.md`, `.claude/CLAUDE.md`, `.claude/rules/*`, `.claude/skills/{testing-orcaq,settings-flow,primary-sidebar}`,
  `docs/*.md` (structure, storage, testing guide), `components/base/data-grid/docs/USAGE_GUIDE.md`
  references → new paths. Content otherwise unchanged.

### Verification (end)

`bun run typecheck`, `bun test:unit`, `bun test:nuxt`, `bun run npx:build`, desktop pre-build,
`graphify update .`. Report anything that differs from the baseline logs.

## Left to the builder

Exact dependency split, root vs app devDependencies, whether each script lives in the app or
root, how `persist`/`storage` split, and any Nuxt 4 compatibility shims needed to keep behavior.
