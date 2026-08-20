# Architecture

Process and build boundaries. Read when work crosses main / preload / renderer / remote / web, or touches `window.api` / IPC.

## Layout

| Tree | Role |
| --- | --- |
| `src/main` | Electron main: window lifecycle, OS features, core IPC (player, remote server, themes, lyrics, …) |
| `src/preload` | `contextBridge` → `window.api` (`src/preload/index.ts`) |
| `src/renderer` | Full app UI (Electron renderer + web build root) |
| `src/remote` | Remote-control SPA, served by the Electron remote feature |
| `packages/core`, `packages/ui`, `packages/i18n`, `packages/lyrics-conversion` | Workspace packages: framework-free core (api/types/constants/logger/utils), React+Mantine ui (components/hooks/themes/styles), locales + i18next setup, furigana/kuroshiro lyrics conversion - no app imports |

## Builds

| Target | Command / config | Notes |
| --- | --- | --- |
| Electron | `pnpm dev` / `build:electron` (`electron.vite.config.ts`) | main + preload + renderer |
| Web | `pnpm build:web` (`web.vite.config.ts`) | `out/web`; Docker uses this |
| Remote | `pnpm build:remote` (`remote.vite.config.ts`) | `out/remote` |
| Default package | `pnpm build` | electron + remote |

Desktop-only surfaces (custom themes, mpv, MPRIS, many `window.api.*` modules) must gate on `isElectron()` and null-check `window.api`. See `docs/CUSTOM_THEMES.md` for themes.

## Aliases

| Alias | → |
| --- | --- |
| `/@/main` | `src/main` (Electron main; not in web/remote vite) |
| `/@/preload` | `src/preload` |
| `/@/renderer` | `src/renderer` |
| `@feishin/core` | `packages/core/src` (workspace package, raw TS via its `exports` map - no build step) |
| `@feishin/ui` | `packages/ui/src` (workspace package, raw TS; typecheck reaches it via tsconfig `paths`) |
| `@feishin/i18n` | `packages/i18n/src` (workspace package, raw TS via its `exports` map - no build step) |
| `@feishin/lyrics-conversion` | `packages/lyrics-conversion/src` (workspace package, raw TS; the electron renderer aliases it to the IPC shim `src/renderer/features/lyrics/api/electron-lyrics-conversion-api.ts`) |
| `/@/remote` | `src/remote` |

## Import boundaries (culture — not ESLint)

- **main** → `/@/main`, `@feishin/core`, `@feishin/lyrics-conversion` only.
- **preload** → preload + `@feishin/core` (plus the existing relative main env exception).
- **core** (`packages/core`) → framework-free: no react/Mantine, no app imports.
- **ui** (`packages/ui`) → no `/@/renderer`, `/@/main`, `/@/remote`, `/@/preload`; may import `@feishin/core` (one-way: core never imports ui).
- **renderer** → `/@/renderer`, `@feishin/core`, `@feishin/ui`, `@feishin/i18n`, `@feishin/lyrics-conversion` (electron builds alias the last to IPC) - not `/@/main`.
- **remote** → `/@/remote`, `@feishin/core`, `@feishin/ui`; may reuse selected `/@/renderer` utilities (theme) — do not grow that into a full renderer dependency.

Electron capabilities from the UI: `window.api.*` (typed in `src/preload/index.d.ts`), never direct main imports.

## Related

- UI / CSS / i18n patterns: `docs/agents/frontend.md`
- Server library API: `docs/agents/api.md`
- Logging: `docs/agents/logging.md`
