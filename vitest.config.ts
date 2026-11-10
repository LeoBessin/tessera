import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'sim', root: './packages/sim', environment: 'node' } },
      { test: { name: 'protocol', root: './packages/protocol', environment: 'node' } },
      { test: { name: 'server', root: './apps/server', environment: 'node' } },
      { test: { name: 'client', root: './apps/client', environment: 'node' } },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['packages/sim/src/**'],
      // The domain is the one place where coverage is a meaningful signal:
      // it is pure, so anything uncovered is simply untested logic.
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
