import { describe, expect, it } from 'vitest';
import { workspaceSchema } from '~/components/modules/workspace/schemas/workspace.schema';

describe('workspaceSchema', () => {
  it('passes with a valid name and default icon', () => {
    const result = workspaceSchema.safeParse({
      name: 'My Workspace',
      icon: 'lucide:badge',
    });
    expect(result.success).toBe(true);
  });

  it('passes with name, icon, and optional desc', () => {
    const result = workspaceSchema.safeParse({
      name: 'Team DB',
      icon: 'lucide:building-2',
      desc: 'Production databases',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.desc).toBe('Production databases');
    }
  });

  it('fails when name is missing', () => {
    const result = workspaceSchema.safeParse({
      icon: 'lucide:badge',
    });
    expect(result.success).toBe(false);
  });

  it('fails when name is explicitly undefined', () => {
    const result = workspaceSchema.safeParse({
      name: undefined,
      icon: 'lucide:badge',
    });
    expect(result.success).toBe(false);
  });

  it('passes when desc is omitted entirely', () => {
    const result = workspaceSchema.safeParse({
      name: 'Solo',
      icon: 'lucide:badge',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.desc).toBeUndefined();
    }
  });

  it('applies default icon from DEFAULT_WORKSPACE_ICON when icon is omitted', () => {
    const result = workspaceSchema.safeParse({ name: 'No Icon WS' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.icon).toBeDefined();
      expect(typeof result.data.icon).toBe('string');
    }
  });

  it('produces correct parsed values for a full payload', () => {
    const result = workspaceSchema.safeParse({
      name: '  Trimmed  ',
      icon: 'lucide:bug',
      desc: 'A description',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('  Trimmed  ');
      expect(result.data.icon).toBe('lucide:bug');
      expect(result.data.desc).toBe('A description');
    }
  });
});
