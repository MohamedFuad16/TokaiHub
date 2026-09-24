import { defineConfig } from 'vitest/config';

// Unit tests for pure logic (text helpers, credit allocation, TIPS parsers) run in Node; the
// app's Vite plugins are not needed for them.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
