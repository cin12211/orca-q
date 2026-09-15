import { describe, expect, it } from 'vitest';
import {
  RawQueryContextMenuSection,
  defineRawQueryPlugin,
} from '~/components/modules/raw-query/registry/rawQueryPlugin.types';

describe('Raw Query Plugin Types & Contracts', () => {
  it('defines RawQueryContextMenuSection enum values', () => {
    expect(RawQueryContextMenuSection.EXECUTION).toBe('execution');
    expect(RawQueryContextMenuSection.ANALYSIS).toBe('analysis');
    expect(RawQueryContextMenuSection.FORMAT).toBe('format');
    expect(RawQueryContextMenuSection.TOOLS).toBe('tools');
    expect(RawQueryContextMenuSection.EDIT).toBe('edit');
  });

  it('allows defining a valid dialect plugin with lifecycle hooks', () => {
    const plugin = defineRawQueryPlugin({
      name: 'test-plugin',
      execute: async () => ({ success: true }),
      preloadSchema: async () => {},
    });

    expect(plugin.name).toBe('test-plugin');
    expect(typeof plugin.execute).toBe('function');
    expect(typeof plugin.preloadSchema).toBe('function');
  });
});
