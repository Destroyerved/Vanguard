import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/fusion/**', 'src/util/**', 'src/ai/grounding.ts', 'src/state/**'],
    },
  },
});
