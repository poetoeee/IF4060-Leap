/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

export default defineConfig(() => {
  const isTest = process.env.VITEST !== undefined;

  return {
    plugins: [
      react(),
      !isTest &&
        electron({
          main: {
            entry: 'electron/main.ts',
            vite: {
              build: {
                rollupOptions: {
                  external: ['@nut-tree-fork/nut-js'],
                },
              },
            },
          },
          preload: {
            input: 'electron/preload.ts',
          },
        }),
    ].filter(Boolean),
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173 },
    test: { environment: 'node', include: ['src/**/*.test.ts'], passWithNoTests: true },
  };
});
