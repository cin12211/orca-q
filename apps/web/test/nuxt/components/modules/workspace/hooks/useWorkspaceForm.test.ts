import { createApp, defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceForm } from '~/components/modules/workspace/hooks/useWorkspaceForm';
import type { Workspace } from '~/core/stores';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateWorkspace = vi.fn();
const mockUpdateWorkspace = vi.fn();

vi.mock('~/core/contexts/useAppContext', () => ({
  useAppContext: () => ({
    workspaceStore: {
      createWorkspace: mockCreateWorkspace,
      updateWorkspace: mockUpdateWorkspace,
    },
  }),
}));

vi.mock('vue-sonner', () => ({
  toast: vi.fn(),
}));

// ---------------------------------------------------------------------------
// withSetup helper — provides component context for vee-validate
// ---------------------------------------------------------------------------

function withSetup<T>(composable: () => T): T {
  let result!: T;
  const app = createApp(
    defineComponent({
      setup() {
        result = composable();
        return () => h('div');
      },
    })
  );
  app.mount(document.createElement('div'));
  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const existingWorkspace: Workspace = {
  id: 'ws-existing',
  name: 'Old Name',
  icon: 'lucide:badge',
  createdAt: '2024-01-01',
  desc: 'Old desc',
};

describe('useWorkspaceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -- Form initialisation -------------------------------------------------

  it('pre-fills form with existing workspace data when updating', () => {
    const { form } = withSetup(() =>
      useWorkspaceForm({
        workspace: existingWorkspace,
        onClose: vi.fn(),
      })
    );

    expect(form.values.name).toBe('Old Name');
    expect(form.values.icon).toBe('lucide:badge');
    expect(form.values.desc).toBe('Old desc');
  });

  it('uses default name based on workspaceSeq for new workspace', () => {
    const { form } = withSetup(() =>
      useWorkspaceForm({ workspaceSeq: 3, onClose: vi.fn() })
    );

    expect(form.values.name).toBe('My workspace 3');
  });

  it('uses workspaceSeq 0 when not provided', () => {
    const { form } = withSetup(() => useWorkspaceForm({ onClose: vi.fn() }));

    expect(form.values.name).toBe('My workspace 0');
  });

  // -- Create submission ---------------------------------------------------

  it('calls createWorkspace with form values on submit (new workspace)', async () => {
    const onClose = vi.fn();

    const { onSubmit, form } = withSetup(() =>
      useWorkspaceForm({ workspaceSeq: 1, onClose })
    );

    form.setValues({
      name: 'My New WS',
      icon: 'lucide:badge',
      desc: 'A great workspace',
    });
    await onSubmit({} as any);

    expect(mockCreateWorkspace).toHaveBeenCalledOnce();
    const created = mockCreateWorkspace.mock.calls[0][0];
    expect(created.name).toBe('My New WS');
    expect(created.icon).toBe('lucide:badge');
    expect(created.desc).toBe('A great workspace');
    expect(created.id).toBeDefined();
    expect(created.createdAt).toBeDefined();
  });

  it('calls onClose after successful create submission', async () => {
    const onClose = vi.fn();

    const { onSubmit, form } = withSetup(() =>
      useWorkspaceForm({ workspaceSeq: 1, onClose })
    );

    form.setValues({ name: 'WS Name', icon: 'lucide:badge' });
    await onSubmit({} as any);

    expect(onClose).toHaveBeenCalledOnce();
  });

  // -- Update submission ---------------------------------------------------

  it('calls updateWorkspace (not createWorkspace) when editing an existing workspace', async () => {
    const onClose = vi.fn();

    const { onSubmit, form } = withSetup(() =>
      useWorkspaceForm({ workspace: existingWorkspace, onClose })
    );

    form.setValues({
      name: 'Updated Name',
      icon: 'lucide:book',
      desc: 'New desc',
    });
    await onSubmit({} as any);

    expect(mockUpdateWorkspace).toHaveBeenCalledOnce();
    expect(mockCreateWorkspace).not.toHaveBeenCalled();

    const updated = mockUpdateWorkspace.mock.calls[0][0];
    expect(updated.name).toBe('Updated Name');
    expect(updated.id).toBe('ws-existing');
    expect(updated.icon).toBe('lucide:book');
  });

  it('calls onClose after successful update submission', async () => {
    const onClose = vi.fn();

    const { onSubmit, form } = withSetup(() =>
      useWorkspaceForm({ workspace: existingWorkspace, onClose })
    );

    form.setValues({ name: 'Updated', icon: 'lucide:badge' });
    await onSubmit({} as any);

    expect(onClose).toHaveBeenCalledOnce();
  });

  // -- Validation ----------------------------------------------------------
  // Note: the workspace schema uses z.string() without .min(1) so empty strings
  // are valid per the schema. Undefined/null name is what gets rejected.

  it('createWorkspace receives whatever name the form contains (schema allows empty string)', async () => {
    const onClose = vi.fn();

    const { onSubmit, form } = withSetup(() =>
      useWorkspaceForm({ workspaceSeq: 0, onClose })
    );

    // z.string() accepts empty strings — submission succeeds
    form.setValues({ name: '', icon: 'lucide:badge' });
    await onSubmit({} as any);

    expect(mockCreateWorkspace).toHaveBeenCalledOnce();
    const created = mockCreateWorkspace.mock.calls[0][0];
    expect(created.name).toBe('');
  });

  it('exposes form and onSubmit', () => {
    const result = withSetup(() => useWorkspaceForm({ onClose: vi.fn() }));

    expect(result.form).toBeDefined();
    expect(result.onSubmit).toBeTypeOf('function');
  });
});
