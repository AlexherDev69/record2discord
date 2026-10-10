import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import packageJson from './package.json' with { type: 'json' };

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: { main: resolve('src/electron/main.ts') },
        // Runtime dependencies stay in node_modules: sharp ships a native binary that cannot be bundled.
        external: ['electron', ...Object.keys(packageJson.dependencies)],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: { preload: resolve('src/electron/preload.ts') },
        external: ['electron'],
        // Sandboxed preload scripts cannot be ES modules.
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    build: { rollupOptions: { input: resolve('src/renderer/index.html') } },
    plugins: [react()],
  },
});
