#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const outputEntry = path.join(ROOT, 'out', 'electron', 'main.js');

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
    '\n[electron:dev] Electron TypeScript reported diagnostics, but updated output was emitted. Continuing with refreshed out/electron artifacts.\n'
  );
}
