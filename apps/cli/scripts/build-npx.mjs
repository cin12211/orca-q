#!/usr/bin/env node
/**
 * Build script for the npx package
 *
 * This script:
 * 1. Copies apps/web/.output to apps/cli/.output
 * 2. Syncs version from the root package.json and runtime dependencies
 *    (database drivers) from apps/web/package.json
 * 3. Prepares the package for npm publishing
 */
import {
  cpSync,
  lstatSync,
  rmSync,
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// apps/cli — the npm package itself
const npxPackageDir = join(__dirname, '..');
const webRoot = join(npxPackageDir, '..', 'web');
const repoRoot = join(npxPackageDir, '..', '..');

const colors = {
  green: '\x1b[32m',
  purple: '\x1b[35m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

function log(step, message) {
  console.log(
    `${colors.purple}Step ${step}:${colors.reset} ${colors.green}${message}${colors.reset}`
  );
}

function error(message) {
  console.error(`${colors.red}Error: ${message}${colors.reset}`);
  process.exit(1);
}

function materializeSymlinks(directoryPath) {
  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isSymbolicLink()) {
      const targetPath = realpathSync(entryPath);

      rmSync(entryPath, { recursive: true, force: true });
      cpSync(targetPath, entryPath, { recursive: true, force: true });

      if (lstatSync(entryPath).isDirectory()) {
        materializeSymlinks(entryPath);
      }

      continue;
    }

    if (entry.isDirectory()) {
      materializeSymlinks(entryPath);
    }
  }
}

// Step 1: Check if .output exists
log(1, 'Checking for .output directory...');
const outputDir = join(webRoot, '.output');

if (!existsSync(outputDir)) {
  error(
    'apps/web/.output directory not found. Run "bun run nuxt:build-web" first.'
  );
}

if (!existsSync(join(outputDir, 'server', 'index.mjs'))) {
  error(
    'apps/web/.output/server/index.mjs not found. Build may be incomplete.'
  );
}

// Step 2: Clean existing .output in apps/cli
log(2, 'Cleaning apps/cli/.output...');
const npxOutputDir = join(npxPackageDir, '.output');
if (existsSync(npxOutputDir)) {
  rmSync(npxOutputDir, { recursive: true, force: true });
}

// Step 3: Copy apps/web/.output to apps/cli
log(3, 'Copying apps/web/.output to apps/cli/.output...');
cpSync(outputDir, npxOutputDir, { recursive: true, dereference: true });

// Step 4: Replace symlinks so npm pack keeps Nitro runtime aliases intact
log(4, 'Materializing copied symlinks...');
materializeSymlinks(npxOutputDir);

// Step 5: Sync version and dependencies from main package.json
log(5, 'Syncing version and dependencies...');
const rootPackageJson = JSON.parse(
  readFileSync(join(repoRoot, 'package.json'), 'utf-8')
);
const webPackageJson = JSON.parse(
  readFileSync(join(webRoot, 'package.json'), 'utf-8')
);
const npxPackageJsonPath = join(npxPackageDir, 'package.json');
const npxPackageJson = JSON.parse(readFileSync(npxPackageJsonPath, 'utf-8'));

npxPackageJson.version = rootPackageJson.version;

// Ensure database drivers are in npx dependencies so they are installed for the target platform
npxPackageJson.dependencies =
  {
    ...(npxPackageJson.dependencies || {}),
    ...(webPackageJson.dependencies || {}),
  } || {};

// skip dependencies with prefix name = 'electron-'
for (const depName of Object.keys(npxPackageJson.dependencies)) {
  if (depName.startsWith('electron-')) {
    delete npxPackageJson.dependencies[depName];
  }
}

writeFileSync(
  npxPackageJsonPath,
  JSON.stringify(npxPackageJson, null, 2) + '\n'
);

// Step 6: Done
log(6, 'Build complete!');
console.log(`
${colors.green}NPX package ready at: ${npxPackageDir}${colors.reset}

To test locally:
  cd apps/cli && npm pack
  npx ./orcaq-${npxPackageJson.version}.tgz

To publish:
  cd apps/cli && npm publish
`);
