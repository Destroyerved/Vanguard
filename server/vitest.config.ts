import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    reporters: ['default'],
    // Pure-node tests — no CSS imports, and skipping CSS processing avoids
    // dragging in the frontend repo's PostCSS/tailwind config (which is not
    // installed in the server workspace).
    css: false,
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/fusion/**', 'src/util/**', 'src/ai/grounding.ts', 'src/state/**'],
    },
  },
});
