import { vi } from 'vitest';

// Nuxt 4 auto-imports `$fetch` from `#build/fetch`, which captures
// `globalThis.$fetch` once at load time. Nuxt tests mock requests with
// `vi.stubGlobal('$fetch', ...)`, so route the auto-import through the
// current global on every call instead.
vi.mock('#build/fetch', () => {
  const current = () => (globalThis as { $fetch: typeof $fetch }).$fetch;
  const proxy = new Proxy(function () {} as unknown as typeof $fetch, {
    apply: (_target, thisArg, args) => Reflect.apply(current(), thisArg, args),
    get: (_target, prop) => Reflect.get(current(), prop),
  });
  return { $fetch: proxy };
});
