#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const RUNTIME_BINARY_NAME = 'orcaq-runtime';
const PKG_BIN_PATH = join(
  projectRoot,
  'node_modules',
  '@yao-pkg',
  'pkg',
  'lib-es5',
  'bin.js'
);
const TAURI_BINARIES_DIR = join(projectRoot, 'src-tauri', 'binaries');
const RUNTIME_DIST_DIR = join(projectRoot, 'tauri-runtime-dist');

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

function log(message, color = 'cyan') {
  console.log(`${colors[color]}[tauri-build]${colors.reset} ${message}`);
}

function fail(message) {
  console.error(`${colors.red}[tauri-build]${colors.reset} ${message}`);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    fail(`${command} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function copyResolvedDirectory(source, target) {
  mkdirSync(target, { recursive: true });

  for (const entryName of readdirSync(source)) {
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

function resolveTargetTriple() {
  const explicitTarget = process.env.TAURI_ENV_TARGET_TRIPLE?.trim();
  if (explicitTarget) {
    return explicitTarget;
  }

  const result = spawnSync('rustc', ['--print', 'host-tuple'], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0) {
    fail('Unable to determine target triple with rustc.');
  }

  const triple = result.stdout.trim();
  if (!triple) {
    fail('rustc returned an empty target triple.');
  }

  return triple;
}

function resolvePkgTarget(targetTriple) {
  const [arch, platform] = targetTriple.split('-');

  const pkgArch =
    arch === 'x86_64'
      ? 'x64'
      : arch === 'aarch64'
        ? 'arm64'
        : arch === 'i686'
          ? 'x86'
          : null;

  const pkgPlatform =
    platform === 'apple'
      ? 'macos'
      : platform === 'pc'
        ? 'win'
        : platform === 'unknown'
          ? 'linux'
          : null;

  if (!pkgArch || !pkgPlatform) {
    fail(`Unsupported Tauri target triple: ${targetTriple}`);
  }

  return `latest-${pkgPlatform}-${pkgArch}`;
}

function resolveBinaryExtension(targetTriple) {
  return targetTriple.includes('windows') ? '.exe' : '';
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const targetTriple = resolveTargetTriple();
const pkgTarget = resolvePkgTarget(targetTriple);
const outputPath = join(
  TAURI_BINARIES_DIR,
  `${RUNTIME_BINARY_NAME}-${targetTriple}${resolveBinaryExtension(targetTriple)}`
);

log('Building Nuxt web runtime...');
run(npmCommand, ['run', 'nuxt:build-web']);

mkdirSync(TAURI_BINARIES_DIR, { recursive: true });
rmSync(RUNTIME_DIST_DIR, { force: true, recursive: true });
mkdirSync(RUNTIME_DIST_DIR, { recursive: true });
copyResolvedDirectory(
  join(projectRoot, '.output', 'server'),
  join(RUNTIME_DIST_DIR, 'server')
);
copyResolvedDirectory(
  join(projectRoot, '.output', 'public'),
  join(RUNTIME_DIST_DIR, 'public')
);
writeFileSync(
  join(RUNTIME_DIST_DIR, 'package.json'),
  JSON.stringify(
    {
      name: 'orcaq-runtime',
      private: true,
      type: 'commonjs',
      bin: 'entry.cjs',
      pkg: {
        assets: ['server/**/*', 'public/**/*'],
      },
    },
    null,
    2
  ) + '\n'
);
writeFileSync(
  join(RUNTIME_DIST_DIR, 'entry.cjs'),
  `const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const extractedRoot = path.join(os.tmpdir(), 'orcaq-runtime', String(process.pid));

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entryName of fs.readdirSync(source)) {
    const sourcePath = path.join(source, entryName);
    const targetPath = path.join(target, entryName);

    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

fs.rmSync(extractedRoot, { recursive: true, force: true });
copyDirectory(path.join(__dirname, 'server'), path.join(extractedRoot, 'server'));
copyDirectory(path.join(__dirname, 'public'), path.join(extractedRoot, 'public'));

process.on('exit', () => {
  fs.rmSync(extractedRoot, { recursive: true, force: true });
});

const serverEntry = pathToFileURL(path.join(extractedRoot, 'server', 'index.mjs')).href;

import(serverEntry).catch(error => {
  console.error(error);
  process.exit(1);
});
`
);
rmSync(outputPath, { force: true });

log(`Packaging Nitro sidecar for ${targetTriple} (${pkgTarget})...`);
run(process.execPath, [
  PKG_BIN_PATH,
  '--targets',
  pkgTarget,
  '--output',
  outputPath,
  '--public',
  '--public-packages',
  '*',
  '--no-bytecode',
  join(RUNTIME_DIST_DIR, 'package.json'),
]);

log(`Prepared sidecar at ${outputPath}`, 'green');
