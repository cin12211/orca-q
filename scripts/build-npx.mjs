#!/usr/bin/env node
/**
 * Build script for the npx package
 *
 * This script:
 * 1. Copies .output to npx-package/
 * 2. Syncs version from main package.json
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
const projectRoot = join(__dirname, '..');

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
const outputDir = join(projectRoot, '.output');
const npxPackageDir = join(projectRoot, 'npx-package');

if (!existsSync(outputDir)) {
  error('.output directory not found. Run "npm run nuxt:build-web" first.');
}

if (!existsSync(join(outputDir, 'server', 'index.mjs'))) {
  error('.output/server/index.mjs not found. Build may be incomplete.');
}

// Step 2: Clean existing .output in npx-package
log(2, 'Cleaning npx-package/.output...');
const npxOutputDir = join(npxPackageDir, '.output');
if (existsSync(npxOutputDir)) {
  rmSync(npxOutputDir, { recursive: true, force: true });
}

// Step 3: Copy .output to npx-package
log(3, 'Copying .output to npx-package...');
cpSync(outputDir, npxOutputDir, { recursive: true, dereference: true });

// Step 4: Replace symlinks so npm pack keeps Nitro runtime aliases intact
log(4, 'Materializing copied symlinks...');
materializeSymlinks(npxOutputDir);

// Step 5: Sync version from main package.json
log(5, 'Syncing version...');
const mainPackageJson = JSON.parse(
  readFileSync(join(projectRoot, 'package.json'), 'utf-8')
);
const npxPackageJsonPath = join(npxPackageDir, 'package.json');
const npxPackageJson = JSON.parse(readFileSync(npxPackageJsonPath, 'utf-8'));

npxPackageJson.version = mainPackageJson.version;

writeFileSync(
  npxPackageJsonPath,
  JSON.stringify(npxPackageJson, null, 2) + '\n'
);

// Step 5: Done
log(6, 'Build complete!');
console.log(`
${colors.green}NPX package ready at: ${npxPackageDir}${colors.reset}

To test locally:
  cd npx-package && npm pack
  npx ./orcaq-${npxPackageJson.version}.tgz

To publish:
  cd npx-package && npm publish
`);
