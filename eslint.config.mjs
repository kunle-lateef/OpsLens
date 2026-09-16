import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Standalone Node CLI script (run via `node tokens/build-tokens.js`),
    // not part of the Next.js app's module system — see tokens/tokens.css's
    // header comment. CommonJS require() there is correct, not a lint issue.
    'tokens/build-tokens.js',
    // Workflow SDK's generated internal route — see .gitignore.
    'app/.well-known/**',
  ]),
]);

export default eslintConfig;
