#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// apps/desktop — independent of the cwd the script is launched from.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputEntry = path.join(ROOT, 'out', 'desktop', 'electron', 'main.js');
const splashSrc = path.join(ROOT, 'electron', 'splash.html');
const splashDestDir = path.join(ROOT, 'out', 'desktop', 'electron');
const splashDest = path.join(splashDestDir, 'splash.html');

try {
  execSync('npx tsc -p electron/tsconfig.json', {
    cwd: ROOT,
    stdio: 'inherit',
  });
} catch (error) {
  if (!existsSync(outputEntry)) {
    throw error;
  }

  console.warn(
    '\n[electron:dev] Electron TypeScript reported diagnostics, but updated output was emitted. Continuing with refreshed out/desktop/electron artifacts.\n'
  );
}

if (existsSync(splashSrc)) {
  mkdirSync(splashDestDir, { recursive: true });
  copyFileSync(splashSrc, splashDest);
}
