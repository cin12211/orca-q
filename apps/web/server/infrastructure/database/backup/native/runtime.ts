import { createError } from 'h3';
import { constants as fsConstants } from 'node:fs';
import { access, readdir } from 'node:fs/promises';
import { delimiter, extname, join } from 'node:path';
import { DatabaseClientType } from '~/core/constants/database-client-type';
import type {
  NativeBackupRuntimeCapability,
  NativeBackupRuntimeSelection,
  NativeBackupRuntimeToolPath,
  NativeBackupToolName,
} from '~/core/types';
import {
  getNativeBackupCapability,
  getNativeBackupImportExtensions,
  getNativeBackupImportTool,
} from './capability';
import {
  buildNativeBackupToolHint,
  formatNativeToolList,
  KNOWN_TOOL_DIRECTORY_PATTERNS,
} from './constants';

export interface RuntimeCapabilityOptions {
  discoverAll?: boolean;
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardToRegExp(segment: string) {
  return new RegExp(`^${segment.split('*').map(escapeForRegExp).join('.*')}$`);
}

async function expandDirectoryPattern(pattern: string) {
  if (!pattern.startsWith('/')) {
    return [];
  }

  const segments = pattern.split('/').filter(Boolean);
  let prefixes = ['/'];

  for (const segment of segments) {
    if (!segment.includes('*')) {
      prefixes = prefixes.map(prefix => join(prefix, segment));
      continue;
    }

    const matcher = wildcardToRegExp(segment);
    const matches = await Promise.all(
      prefixes.map(async prefix => {
        try {
          const entries = await readdir(prefix, { withFileTypes: true });
          return entries
            .filter(entry => entry.isDirectory() && matcher.test(entry.name))
            .map(entry => join(prefix, entry.name));
        } catch {
          return [];
        }
      })
    );

    prefixes = matches.flat();
  }

  return prefixes;
}

async function getCandidateDirectories(
  command: NativeBackupToolName,
  discoverAll = false
) {
  const directories = new Set(
    (process.env.PATH || '').split(delimiter).filter(Boolean)
  );

  if (discoverAll) {
    const patterns = KNOWN_TOOL_DIRECTORY_PATTERNS[command] || [];
    const expandedDirectories = await Promise.all(
      patterns.map(pattern => expandDirectoryPattern(pattern))
    );

    expandedDirectories.flat().forEach(directory => {
      directories.add(directory);
    });
  }

  return [...directories];
}

function getCandidateNames(command: NativeBackupToolName) {
  const hasKnownExtension = extname(command).length > 0;

  if (process.platform !== 'win32' || hasKnownExtension) {
    return [command];
  }

  return [
    command,
    ...(process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM')
      .split(';')
      .filter(Boolean)
      .map(extension => `${command}${extension.toLowerCase()}`),
  ];
}

async function hasExecutable(candidatePath: string) {
  try {
    await access(
      candidatePath,
      process.platform === 'win32' ? fsConstants.F_OK : fsConstants.X_OK
    );
    return true;
  } catch {
    return false;
  }
}

async function resolveExecutablePaths(
  command: NativeBackupToolName,
  discoverAll = false
) {
  const pathEntries = await getCandidateDirectories(command, discoverAll);
  const candidateNames = getCandidateNames(command);
  const discoveredPaths: string[] = [];

  for (const pathEntry of pathEntries) {
    for (const candidateName of candidateNames) {
      const candidatePath = join(pathEntry, candidateName);

      if (await hasExecutable(candidatePath)) {
        discoveredPaths.push(candidatePath);
      }
    }
  }

  return [...new Set(discoveredPaths)];
}

async function resolveAvailableTools(
  candidates: NativeBackupToolName[],
  options?: RuntimeCapabilityOptions
) {
  const uniqueCandidates = [...new Set(candidates)];
  const results = await Promise.all(
    uniqueCandidates.map(async tool => {
      const paths = await resolveExecutablePaths(
        tool,
        options?.discoverAll || false
      );

      return paths.map(
        path => ({ tool, path }) satisfies NativeBackupRuntimeToolPath
      );
    })
  );

  return results.flat();
}

function buildRuntimeUnavailableMessage(
  actionLabel: 'backup' | 'restore',
  tools: NativeBackupToolName[]
) {
  return `Native ${actionLabel} requires ${formatNativeToolList(tools)} on PATH.`;
}

export async function getNativeBackupRuntimeCapability(
  type?: DatabaseClientType | null,
  options?: RuntimeCapabilityOptions
): Promise<NativeBackupRuntimeCapability> {
  const capability = getNativeBackupCapability(type);
  const availableExportTools = capability.supported
    ? await resolveAvailableTools(capability.exportToolCandidates, options)
    : [];
  const availableImportTools = capability.supported
    ? await resolveAvailableTools(capability.importToolCandidates, options)
    : [];
  const exportToolNames = [
    ...new Set(availableExportTools.map(tool => tool.tool)),
  ];
  const importToolNames = [
    ...new Set(availableImportTools.map(tool => tool.tool)),
  ];
  const missingExportTools = capability.exportToolCandidates.filter(
    tool => !exportToolNames.includes(tool)
  );
  const missingImportTools = capability.importToolCandidates.filter(
    tool => !importToolNames.includes(tool)
  );
  const exportAvailable = capability.supported && exportToolNames.length > 0;
  const importAvailable = capability.supported && importToolNames.length > 0;
  const available = exportAvailable || importAvailable;
  const exportMessage = !capability.supported
    ? capability.reason ||
      `${type || 'Unknown'} native backup is not supported.`
    : exportAvailable
      ? `Native backup is ready via ${formatNativeToolList(exportToolNames)}.`
      : `${buildRuntimeUnavailableMessage('backup', capability.exportToolCandidates)} Install the missing tool and retry.`;
  const importMessage = !capability.supported
    ? capability.reason ||
      `${type || 'Unknown'} native restore is not supported.`
    : importAvailable
      ? `Native restore is ready via ${formatNativeToolList(importToolNames)}.`
      : `${buildRuntimeUnavailableMessage('restore', capability.importToolCandidates)} Install the missing tool and retry.`;

  let supportMessage =
    capability.reason || 'Select a connection to use native backup tools.';

  if (capability.supported) {
    if (exportAvailable && importAvailable) {
      supportMessage = `${capability.label} is ready. ${exportMessage} ${importMessage}`;
    } else if (available) {
      supportMessage = `Native tool availability is partial. ${exportMessage} ${importMessage}`;
    } else {
      supportMessage = `Native tools are missing. ${exportMessage} ${importMessage}`;
    }
  }

  return {
    type: type || null,
    label: capability.label,
    toolHint: buildNativeBackupToolHint(capability),
    supported: capability.supported,
    available,
    exportAvailable,
    importAvailable,
    formatOptions: capability.formatOptions.map(option => ({
      format: option.format,
      extension: option.fileExtension,
      label: option.label,
      fileKind: option.fileKind,
      importTool: option.importTool,
    })),
    acceptExtensions: getNativeBackupImportExtensions(type).join(',') || '.sql',
    defaultExportFormat: capability.defaultExportFormat,
    availableExportTools: exportToolNames,
    availableImportTools: importToolNames,
    availableExportToolPaths: availableExportTools,
    availableImportToolPaths: availableImportTools,
    missingExportTools,
    missingImportTools,
    supportMessage,
    exportMessage,
    importMessage,
    reason: capability.reason,
  };
}

export async function ensureNativeBackupOperationAvailable(
  type: DatabaseClientType | null | undefined,
  operation: 'export' | 'import',
  fileName?: string,
  runtime?: NativeBackupRuntimeSelection
) {
  const capability = await getNativeBackupRuntimeCapability(type);
  const staticCapability = getNativeBackupCapability(type);

  if (!capability.supported || !type) {
    throw createError({
      statusCode: 501,
      statusMessage:
        capability.reason ||
        `${type || 'Unknown'} native backup is not supported.`,
    });
  }

  const requestedExecutablePath = runtime?.executablePath?.trim();

  if (requestedExecutablePath) {
    const allowedTools =
      operation === 'export'
        ? staticCapability.exportToolCandidates
        : type === DatabaseClientType.POSTGRES && fileName
          ? [getNativeBackupImportTool(type, fileName)]
          : staticCapability.importToolCandidates;

    if (!runtime?.tool) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'A native tool must be selected when a custom executable path is provided.',
      });
    }

    if (!allowedTools.includes(runtime.tool)) {
      throw createError({
        statusCode: 400,
        statusMessage: `${runtime.tool} cannot be used for this ${operation} request.`,
      });
    }

    if (!(await hasExecutable(requestedExecutablePath))) {
      throw createError({
        statusCode: 400,
        statusMessage: `Configured executable was not found or is not executable: ${requestedExecutablePath}`,
      });
    }

    return;
  }

  if (operation === 'export' && !capability.exportAvailable) {
    throw createError({
      statusCode: 503,
      statusMessage: capability.exportMessage,
    });
  }

  if (operation === 'import') {
    if (!capability.importAvailable) {
      throw createError({
        statusCode: 503,
        statusMessage: capability.importMessage,
      });
    }

    if (type === DatabaseClientType.POSTGRES && fileName) {
      const requiredImportTool = getNativeBackupImportTool(type, fileName);

      if (!capability.availableImportTools.includes(requiredImportTool)) {
        throw createError({
          statusCode: 503,
          statusMessage: `${requiredImportTool} is required to restore ${fileName}. ${capability.importMessage}`,
        });
      }
    }
  }
}
