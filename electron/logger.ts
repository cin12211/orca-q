import log from 'electron-log/main';
import path from 'node:path';

const IS_DEV = process.env.NODE_ENV === 'development';

let loggerInitialized = false;

export function initializeElectronLogger(): void {
  if (loggerInitialized) {
    return;
  }

  loggerInitialized = true;

  log.initialize();

  if (IS_DEV) {
    log.transports.file.resolvePathFn = variables =>
      path.join(
        process.cwd(),
        '.electron-logs',
        variables.fileName ?? 'main.log'
      );
  }

  log.transports.file.level = IS_DEV ? 'debug' : 'info';
  log.transports.file.format =
    '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] [{scope}] {text}';
  log.transports.console.level = IS_DEV ? 'debug' : 'info';
  log.transports.console.format =
    '[{h}:{i}:{s}.{ms}] [{level}] [{scope}] {text}';

  // Route existing main-process console usage through electron-log as well.
  Object.assign(console, log.functions);

  log.errorHandler.startCatching({
    showDialog: false,
  });
}

export function createLogger(scopeLabel: string) {
  return log.scope(scopeLabel);
}

export { log as electronLog };
