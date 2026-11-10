import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/main.ts'],
  platform: 'node',
  target: 'node24',
  format: ['esm'],
  // The workspace packages are TypeScript source, so they are bundled in rather
  // than resolved at runtime. Everything else stays external and is installed
  // from the lockfile in the image.
  noExternal: [/^@tessera\//],
  clean: true,
});
