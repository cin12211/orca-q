import { createRequire } from 'node:module';
import type * as TypeScript from 'typescript';

const require = createRequire(import.meta.url);

// TypeScript's Node system expects CommonJS globals such as __filename.
export const typeScriptCompiler = require('typescript') as typeof TypeScript;
