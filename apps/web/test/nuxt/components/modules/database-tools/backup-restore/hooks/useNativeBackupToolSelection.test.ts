import { nextTick, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useNativeBackupToolSelection } from '~/components/modules/database-tools/backup-restore/hooks/useNativeBackupToolSelection';

describe('useNativeBackupToolSelection', () => {
  it('uses the first detected executable when desktop runtime selection is enabled', () => {
    const toolPaths = ref([
      {
        tool: 'pg_dump' as const,
        path: '/Applications/Postgres.app/Contents/Versions/16/bin/pg_dump',
      },
      {
        tool: 'pg_dump' as const,
        path: '/Applications/Postgres.app/Contents/Versions/15/bin/pg_dump',
      },
    ]);
    const toolChoices = ref(['pg_dump'] as const);
    const enabled = ref(true);

    const { selection, runtimeSelection, canSubmit } =
      useNativeBackupToolSelection(
        toolPaths as any,
        toolChoices as any,
        enabled
      );

    expect(selection.value.useCustomPath).toBe(false);
    expect(selection.value.selectedPath).toBe(toolPaths.value[0]?.path);
    expect(runtimeSelection.value).toEqual({
      tool: 'pg_dump',
      executablePath: toolPaths.value[0]?.path,
    });
    expect(canSubmit.value).toBe(true);
  });

  it('falls back to a custom executable path when nothing is detected', async () => {
    const toolPaths = ref([]);
    const toolChoices = ref(['pg_restore', 'psql'] as const);
    const enabled = ref(true);

    const { selection, runtimeSelection, canSubmit } =
      useNativeBackupToolSelection(
        toolPaths as any,
        toolChoices as any,
        enabled
      );

    expect(selection.value.useCustomPath).toBe(true);
    expect(selection.value.customTool).toBe('pg_restore');
    expect(runtimeSelection.value).toBeUndefined();
    expect(canSubmit.value).toBe(false);

    selection.value.customPath =
      '/Applications/Postgres.app/Contents/Versions/16/bin/pg_restore';
    await nextTick();

    expect(runtimeSelection.value).toEqual({
      tool: 'pg_restore',
      executablePath:
        '/Applications/Postgres.app/Contents/Versions/16/bin/pg_restore',
    });
    expect(canSubmit.value).toBe(true);
  });
});
