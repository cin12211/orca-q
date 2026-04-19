// Shim to allow TypeScript to accept .vue file imports during electron compilation.
// Vue component types are not used at runtime in the electron main process.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >;
  export default component;
}
