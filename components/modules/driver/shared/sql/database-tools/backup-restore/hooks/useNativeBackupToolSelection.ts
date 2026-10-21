import type {
  NativeBackupRuntimeSelection,
  NativeBackupRuntimeToolPath,
  NativeBackupToolName,
} from '~/core/types';
import type { BackupRestoreRuntimeToolSelection } from '../types/backup-restore.types';

function createDefaultSelection(): BackupRestoreRuntimeToolSelection {
  return {
    useCustomPath: false,
    selectedPath: '',
    customPath: '',
    customTool: '',
  };
}

export const useNativeBackupToolSelection = (
  availableToolPaths: Ref<NativeBackupRuntimeToolPath[]>,
  toolChoices: Ref<NativeBackupToolName[]>,
  enabled: Ref<boolean>
) => {
  const selection = ref<BackupRestoreRuntimeToolSelection>(
    createDefaultSelection()
  );

  const filteredToolPaths = computed(() => {
    const allowedTools = new Set(toolChoices.value);

    return availableToolPaths.value.filter(
      toolPath => allowedTools.size === 0 || allowedTools.has(toolPath.tool)
    );
  });

  const selectedDetectedTool = computed(
    () =>
      filteredToolPaths.value.find(
        toolPath => toolPath.path === selection.value.selectedPath
      ) || null
  );

  watch(
    [filteredToolPaths, toolChoices, enabled],
    ([paths, tools, isEnabled]) => {
      if (!isEnabled) {
        selection.value = createDefaultSelection();
        return;
      }

      if (!tools.includes(selection.value.customTool as NativeBackupToolName)) {
        selection.value.customTool = tools[0] || '';
      }

      if (
        !paths.some(toolPath => toolPath.path === selection.value.selectedPath)
      ) {
        selection.value.selectedPath = paths[0]?.path || '';
      }

      if (!paths.length) {
        selection.value.useCustomPath = true;
        return;
      }

      if (selection.value.useCustomPath && !selection.value.customPath.trim()) {
        selection.value.useCustomPath = false;
      }
    },
    { immediate: true }
  );

  const runtimeSelection = computed<NativeBackupRuntimeSelection | undefined>(
    () => {
      if (!enabled.value) {
        return undefined;
      }

      if (selection.value.useCustomPath) {
        const executablePath = selection.value.customPath.trim();
        const tool = selection.value.customTool;

        if (!executablePath || !tool) {
          return undefined;
        }

        return {
          tool,
          executablePath,
        };
      }

      if (!selectedDetectedTool.value) {
        return undefined;
      }

      return {
        tool: selectedDetectedTool.value.tool,
        executablePath: selectedDetectedTool.value.path,
      };
    }
  );

  const canSubmit = computed(
    () => !enabled.value || Boolean(runtimeSelection.value)
  );

  return {
    selection,
    filteredToolPaths,
    runtimeSelection,
    canSubmit,
  };
};
