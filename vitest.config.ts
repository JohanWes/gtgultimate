import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
