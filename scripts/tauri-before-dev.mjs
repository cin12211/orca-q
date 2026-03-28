import { spawn } from 'node:child_process';
import http from 'node:http';

const devServerUrl =
  process.env.TAURI_DEV_SERVER_URL ?? 'http://127.0.0.1:3000';

function isDevServerReachable(url) {
  return new Promise(resolve => {
    const request = http.get(url, response => {
      response.resume();
      resolve(true);
    });

    request.on('error', () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

if (await isDevServerReachable(devServerUrl)) {
  console.log(
    `[tauri-dev] Reusing existing Nuxt dev server at ${devServerUrl}.`
  );
  process.exit(0);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmCommand, ['run', 'nuxt:dev'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NUXT_TAURI_DEV: '1',
  },
});

const forwardSignal = signal => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', code => {
  process.exit(code ?? 0);
});
