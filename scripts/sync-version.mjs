#!/usr/bin/env node
/**
 * Sync version from main package.json to related package/config files.
 *
 * This script is automatically run after version bump commands
 * to keep package and desktop versions aligned.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

const JSON_VERSION_TARGETS = ['npx-package/package.json'];

function log(message, color = 'cyan') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function syncJsonVersion(targetPath, version) {
  const fullPath = join(projectRoot, targetPath);

  if (!existsSync(fullPath)) {
    log(`⚠ Skipped (not found): ${targetPath}`, 'yellow');
    return false;
  }

  try {
    const jsonFile = JSON.parse(readFileSync(fullPath, 'utf-8'));
    const oldVersion = jsonFile.version;

    if (oldVersion === version) {
      log(`✓ Already synced: ${targetPath} (${version})`, 'green');
      return true;
    }

    jsonFile.version = version;
    writeFileSync(fullPath, JSON.stringify(jsonFile, null, 2) + '\n');

    log(`✓ Synced: ${targetPath} (${oldVersion} → ${version})`, 'green');
    return true;
  } catch (error) {
    log(`✗ Failed: ${targetPath} - ${error.message}`, 'red');
    return false;
  }
}

try {
  const mainPackageJsonPath = join(projectRoot, 'package.json');
  const mainPackageJson = JSON.parse(
    readFileSync(mainPackageJsonPath, 'utf-8')
  );
  const version = mainPackageJson.version;

  log(`\n📦 Syncing version: ${version}\n`, 'cyan');

  let successCount = 0;
  let failCount = 0;

  for (const target of JSON_VERSION_TARGETS) {
    const success = syncJsonVersion(target, version);

    if (success) successCount++;
    else failCount++;
  }

  const totalTargets = JSON_VERSION_TARGETS.length;

  log(`\n✨ Version sync complete!`, 'cyan');
  log(`   Successfully synced: ${successCount}/${totalTargets}`, 'green');

  if (failCount > 0) {
    log(`   Failed or skipped: ${failCount}`, 'yellow');
  }

  process.exit(0);
} catch (error) {
  log(`\n✗ Error syncing version: ${error.message}`, 'red');
  process.exit(1);
}
