#!/usr/bin/env node
/**
 * Sync version from main package.json to target package.json files
 *
 * This script is automatically run after version bump commands
 * to keep all package.json files in sync.
 *
 * To add more sync targets, simply add paths to the SYNC_TARGETS array.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const colors = {
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

// Define sync targets - add more paths here as needed
const SYNC_TARGETS = [
  'npx-package/package.json',
  // Add more target paths here in the future
  // 'electron/package.json',
  // 'packages/cli/package.json',
];

function log(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function syncVersion(targetPath, version) {
  const fullPath = join(projectRoot, targetPath);

  if (!existsSync(fullPath)) {
    log(`⚠ Skipped (not found): ${targetPath}`, 'yellow');
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(fullPath, 'utf-8'));
    const oldVersion = packageJson.version;

    if (oldVersion === version) {
      log(`✓ Already synced: ${targetPath} (${version})`, 'green');
      return true;
    }

    packageJson.version = version;
    writeFileSync(fullPath, JSON.stringify(packageJson, null, 2) + '\n');

    log(`✓ Synced: ${targetPath} (${oldVersion} → ${version})`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${targetPath} - ${error.message}`, 'red');
    return false;
  }
}

try {
  // Read main package.json
  const mainPackageJsonPath = join(projectRoot, 'package.json');
  const mainPackageJson = JSON.parse(
    readFileSync(mainPackageJsonPath, 'utf-8')
  );
  const version = mainPackageJson.version;

  log(`\n📦 Syncing version: ${version}\n`, 'cyan');

  // Sync to all targets
  let successCount = 0;
  let failCount = 0;

  for (const target of SYNC_TARGETS) {
    const success = syncVersion(target, version);
    if (success) successCount++;
    else failCount++;
  }

  // Summary
  log(`\n✨ Version sync complete!`, 'cyan');
  log(
    `   Successfully synced: ${successCount}/${SYNC_TARGETS.length}`,
    'green'
  );

  if (failCount > 0) {
    log(`   Failed or skipped: ${failCount}`, 'yellow');
  }

  process.exit(0);
} catch (error) {
  log(`\n✗ Error syncing version: ${error.message}`, 'red');
  process.exit(1);
}
