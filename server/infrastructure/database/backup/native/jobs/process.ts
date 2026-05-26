import { createError } from 'h3';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createReadStream, createWriteStream } from 'node:fs';
import type { NativeBackupRuntimeSelection } from '~/core/types';
import type { NativeBackupToolName } from '../../native-backup';
import type { JobProgressUpdater, ResolvedNativeToolInvocation } from './types';

function createMissingCommandError(command: string) {
  const error = new Error(
    `${command} is not installed on the runtime host.`
  ) as Error & {
    cliCode?: string;
  };

  error.cliCode = 'CLI_NOT_FOUND';
  return error;
}

function isMissingCommandError(error: unknown) {
  return (
    error instanceof Error &&
    (error as Error & { cliCode?: string }).cliCode === 'CLI_NOT_FOUND'
  );
}

function collectLines(onLine?: (line: string) => void) {
  let buffer = '';

  return (chunk: Buffer | string) => {
    buffer += chunk.toString();

    while (buffer.includes('\n')) {
      const newLineIndex = buffer.indexOf('\n');
      const line = buffer.slice(0, newLineIndex).trim();
      buffer = buffer.slice(newLineIndex + 1);

      if (line) {
        onLine?.(line);
      }
    }
  };
}

export async function runCommandToFile({
  command,
  args,
  env,
  outputPath,
  onBytes,
  onStderrLine,
}: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  outputPath: string;
  onBytes?: (bytes: number) => void;
  onStderrLine?: (line: string) => void;
}) {
  const child = spawn(command, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = createWriteStream(outputPath);
  const parseStderr = collectLines(onStderrLine);
  let stderr = '';
  let writtenBytes = 0;

  child.stdout?.on('data', chunk => {
    writtenBytes += chunk.length;
    onBytes?.(writtenBytes);
    output.write(chunk);
  });

  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
    parseStderr(chunk);
  });

  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('close', exitCode => resolve(exitCode));
    child.once('error', error => {
      reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? createMissingCommandError(command)
          : error
      );
    });
    output.once('error', error => {
      child.kill('SIGTERM');
      reject(error);
    });
  });

  output.end();
  await once(output, 'finish');

  if (code !== 0) {
    throw new Error(stderr.trim() || `${command} exited with code ${code}`);
  }

  return {
    bytesWritten: writtenBytes,
    stderr: stderr.trim(),
  };
}

export async function runCommandWithInputFile({
  command,
  args,
  env,
  inputPath,
  onBytes,
  onStderrLine,
}: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  inputPath: string;
  onBytes?: (bytes: number) => void;
  onStderrLine?: (line: string) => void;
}) {
  const child = spawn(command, args, {
    env,
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  const input = createReadStream(inputPath);
  const parseStderr = collectLines(onStderrLine);
  let stderr = '';
  let streamedBytes = 0;

  input.on('data', chunk => {
    streamedBytes += chunk.length;
    onBytes?.(streamedBytes);
  });

  input.on('error', error => {
    child.stdin?.destroy(error);
  });

  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
    parseStderr(chunk);
  });

  input.pipe(child.stdin!);

  const code = await new Promise<number | null>((resolve, reject) => {
    child.once('close', exitCode => resolve(exitCode));
    child.once('error', error => {
      reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? createMissingCommandError(command)
          : error
      );
    });
    input.once('error', error => {
      child.kill('SIGTERM');
      reject(error);
    });
  });

  if (code !== 0) {
    throw new Error(stderr.trim() || `${command} exited with code ${code}`);
  }

  return {
    bytesRead: streamedBytes,
    stderr: stderr.trim(),
  };
}

export async function runCommandCapture({
  command,
  args,
  env,
  onStderrLine,
}: {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  onStderrLine?: (line: string) => void;
}) {
  const child = spawn(command, args, {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  const parseStderr = collectLines(onStderrLine);

  child.stdout?.on('data', chunk => {
    stdout += chunk.toString();
  });

  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
    parseStderr(chunk);
  });

  const closePromise = once(child, 'close') as Promise<[number | null]>;
  const errorPromise = once(child, 'error').catch(() => null);
  const result = await Promise.race([
    closePromise.then(([code]) => ({ code })),
    errorPromise.then(value => {
      if (!value) {
        return Promise.reject(new Error('Unknown command failure.'));
      }

      const [error] = value;

      return Promise.reject(
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? createMissingCommandError(command)
          : error
      );
    }),
  ]);

  if (result.code !== 0) {
    throw new Error(
      stderr.trim() || `${command} exited with code ${result.code}`
    );
  }

  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

export async function withCommandFallback<T>(
  candidates: NativeBackupToolName[],
  run: (invocation: ResolvedNativeToolInvocation) => Promise<T>,
  requestedRuntime?: NativeBackupRuntimeSelection
) {
  const requestedExecutablePath = requestedRuntime?.executablePath?.trim();

  if (requestedExecutablePath) {
    if (!requestedRuntime?.tool) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'A native tool must be selected when a custom executable path is provided.',
      });
    }

    if (!candidates.includes(requestedRuntime.tool)) {
      throw createError({
        statusCode: 400,
        statusMessage: `${requestedRuntime.tool} cannot be used for this request.`,
      });
    }

    return run({
      tool: requestedRuntime.tool,
      command: requestedExecutablePath,
      displayName: requestedExecutablePath,
    });
  }

  let lastMissingError: Error | null = null;

  for (const command of candidates) {
    try {
      return await run({
        tool: command,
        command,
        displayName: command,
      });
    } catch (error) {
      if (isMissingCommandError(error)) {
        lastMissingError = error as Error;
        continue;
      }

      throw error;
    }
  }

  throw (
    lastMissingError ||
    new Error('No supported native backup tool is available.')
  );
}
