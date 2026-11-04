#!/usr/bin/env node
/**
 * Pre-build script for the Electron desktop release.
 * Runs before electron-builder packages the app.
 *
 * Steps:
 *   1. nuxt generate → .output/public (static SPA)
 *   2. Build Nitro server binary → out/runtime/
 *   3. tsc → compile electron/ TypeScript → out/electron/
 */
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const ELECTRON_RUNTIME_DIR = join(ROOT, 'out', 'runtime');

function log(msg) {
  console.log(`\x1b[36m[electron-build]\x1b[0m ${msg}`);
}

function run(cmd, cwd = ROOT) {
  log(`→ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

// ─── Step 1: Generate Nuxt SPA and Nitro server ───────────────────────────
log('Step 1/3: Building Nuxt static SPA and Nitro server...');
run('bun run nuxt:build-web');

// ─── Step 2: Copy server to out/runtime ──────────────────────────────────
log('Step 2/3: Staging Nuxt output into electron runtime...');

if (existsSync(ELECTRON_RUNTIME_DIR)) {
  rmSync(ELECTRON_RUNTIME_DIR, { recursive: true });
}
mkdirSync(ELECTRON_RUNTIME_DIR, { recursive: true });

// Custom copy function that naturally dereferences/flattens all symlinks (crucial for pnpm virtual stores and macOS codesign)
function copyResolvedDirectory(source, target) {
  mkdirSync(target, { recursive: true });

  for (const entryName of readdirSync(source)) {
    // Skip debug folders
    if (entryName === '.nitro') continue;

    const sourcePath = join(source, entryName);
    const targetPath = join(target, entryName);
    const stats = statSync(sourcePath);

    if (stats.isDirectory()) {
      copyResolvedDirectory(sourcePath, targetPath);
      continue;
    }

    copyFileSync(sourcePath, targetPath);
  }
}

// Copy the full `.output` (server/ and public/) into out/runtime/
// We MUST use copyResolvedDirectory, otherwise macOS codesign fails due to pnpm virtual stores
copyResolvedDirectory(join(ROOT, '.output'), ELECTRON_RUNTIME_DIR);

log(`  Runtime server scripts ready at ${ELECTRON_RUNTIME_DIR}/`);

// ─── Step 3: Compile Electron TypeScript ─────────────────────────────────
log('Step 3/3: Compiling Electron TypeScript...');
run(`npx tsc -p electron/tsconfig.json`);

log('\n✅ Electron pre-build complete! Ready for electron-builder.\n');
