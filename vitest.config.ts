import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // tests/e2e/** are Playwright specs (npm run test:e2e), not Vitest's —
    // Vitest's default include glob matches *.spec.ts too, and Playwright's
    // test.describe() isn't compatible with Vitest's runner.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
