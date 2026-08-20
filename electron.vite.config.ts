import { defineConfig, UserConfig } from 'electron-vite';
import { resolve } from 'path';
import conditionalImportPlugin from 'vite-plugin-conditional-import';
import dynamicImportPlugin from 'vite-plugin-dynamic-import';
import { ViteEjsPlugin } from 'vite-plugin-ejs';

import { createReactPlugin } from './vite.react-plugin';

const currentOSEnv = process.platform;
const electronRendererTarget = 'chrome87';

const createConfig = (isDevelopment: boolean): UserConfig => ({
    main: {
        build: {
            externalizeDeps: {
                exclude: ['@feishin/core'],
            },
            rollupOptions: {
                external: ['source-map-support'],
            },
            sourcemap: true,
        },
        define: {
            'import.meta.env.IS_LINUX': JSON.stringify(currentOSEnv === 'linux'),
            'import.meta.env.IS_MACOS': JSON.stringify(currentOSEnv === 'darwin'),
            'import.meta.env.IS_WIN': JSON.stringify(currentOSEnv === 'win32'),
        },
        plugins: [
            dynamicImportPlugin(),
            conditionalImportPlugin({
                currentEnv: currentOSEnv,
                envs: ['win32', 'linux', 'darwin'],
            }),
        ],
        resolve: {
            alias: {
                '/@/main': resolve('src/main'),
            },
        },
    },
    preload: {
        build: {
            externalizeDeps: { exclude: ['@feishin/core'] },
            sourcemap: true,
        },
        resolve: {
            alias: {
                '/@/preload': resolve('src/preload'),
            },
        },
    },
    renderer: {
        build: {
            cssMinify: 'esbuild',
            minify: 'esbuild',
            modulePreload: {
                polyfill: false,
            },
            sourcemap: true,
            target: electronRendererTarget,
        },
        css: {
            modules: {
                generateScopedName: 'fs-[name]-[local]',
                localsConvention: 'camelCase',
            },
        },
        plugins: [createReactPlugin(), ViteEjsPlugin({ web: false })],
        resolve: {
            alias: [
                { find: '/@/remote', replacement: resolve('src/remote') },
                { find: '/@/renderer', replacement: resolve('src/renderer') },
                // Desktop runs kuroshiro in the main process (IPC); swap the package for the IPC shim.
                {
                    find: /^@feishin\/lyrics-conversion(\/index)?$/,
                    replacement: resolve(
                        'src/renderer/features/lyrics/api/electron-lyrics-conversion-api.ts',
                    ),
                },
                ...(isDevelopment
                    ? [{ find: 'path', replacement: resolve('src/renderer/shims/path.ts') }]
                    : []),
            ],
        },
    },
});

export default defineConfig(({ command }) => createConfig(command === 'serve'));
