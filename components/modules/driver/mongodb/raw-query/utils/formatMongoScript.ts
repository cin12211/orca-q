const mongoPrettierOptions = {
  parser: 'typescript',
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf',
} as const;

/** Formats a Mongo raw-query script with the project's TypeScript style. */
export async function formatMongoScript(source: string): Promise<string> {
  const [prettier, typescript, estree] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/typescript'),
    import('prettier/plugins/estree'),
  ]);

  return prettier.format(source, {
    ...mongoPrettierOptions,
    plugins: [typescript.default, estree.default],
  });
}
