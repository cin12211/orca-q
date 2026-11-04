import '@nuxt/test-utils/e2e';

declare module '@nuxt/test-utils/e2e' {
  export const $fetch: <T = any>(request: string, options?: any) => Promise<T>;
}
