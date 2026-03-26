import { describe, it, expect } from 'vitest';
import { useAppLoading } from '~/core/composables/useAppLoading';

describe('useAppLoading', () => {
  it('starts with loading false', () => {
    const { isLoading, finish } = useAppLoading();
    finish();
    expect(isLoading.value).toBe(false);
  });

  it('sets loading true on start', () => {
    const { isLoading, start, finish } = useAppLoading();
    finish();
    start();
    expect(isLoading.value).toBe(true);
  });

  it('sets loading false on finish', () => {
    const { isLoading, start, finish } = useAppLoading();
    start();
    finish();
    expect(isLoading.value).toBe(false);
  });

  it('keeps true when start is called repeatedly', () => {
    const { isLoading, start, finish } = useAppLoading();
    finish();
    start();
    start();
    expect(isLoading.value).toBe(true);
  });

  it('keeps false when finish is called repeatedly', () => {
    const { isLoading, finish } = useAppLoading();
    finish();
    finish();
    expect(isLoading.value).toBe(false);
  });

  it('shares singleton state across instances', () => {
    const first = useAppLoading();
    const second = useAppLoading();

    second.finish();
    first.start();

    expect(second.isLoading.value).toBe(true);
  });

  it('can reset singleton state from a different instance', () => {
    const first = useAppLoading();
    const second = useAppLoading();

    first.start();
    second.finish();

    expect(first.isLoading.value).toBe(false);
  });

  it('supports start-finish-start sequence', () => {
    const { isLoading, start, finish } = useAppLoading();

    finish();
    start();
    finish();
    start();

    expect(isLoading.value).toBe(true);
  });
});
