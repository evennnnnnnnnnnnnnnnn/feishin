import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// Mirrors the `/@/...` aliases the electron-vite configs declare, so tests can import
// source modules the same way source does. Without this only type-only `/@/` imports work,
// because those are erased before resolution ever happens.
export default defineConfig({
    resolve: {
        alias: {
            '/@/i18n': resolve('src/i18n'),
            '/@/main': resolve('src/main'),
            '/@/preload': resolve('src/preload'),
            '/@/remote': resolve('src/remote'),
            '/@/renderer': resolve('src/renderer'),
            '/@/shared': resolve('src/shared'),
        },
    },
});
