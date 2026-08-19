# Monorepo workspace topology

Feishin was a single npm package with `src/shared` consumed via Vite path aliases, which let the remote PWA import desktop renderer code and let the web build pull in main-process code - boundaries that could not be enforced or tree-shaken. We restructured it as a pnpm-workspace monorepo: two apps (the desktop app at the root, and `apps/remote`) plus four consumed packages (`@feishin/core`, `@feishin/ui`, `@feishin/i18n`, `@feishin/lyrics-conversion`).

We split the old `shared` into **core** (framework-free: types, API normalization, constants, logging) and **ui** (React + Mantine components/hooks/themes) so that a consumer needing only domain types never resolves Mantine - which is what makes side-effect tree-shaking effective. Packages are consumed as raw TypeScript source (no per-package build step) because the Vite pipeline already transpiled `src/shared` as source; a workspace package is the same mechanism with a declared dependency instead of an alias.

## Considered options

- **turbo / nx** - rejected. Two apps + four small packages do not justify a task graph or remote cache; `pnpm -r run ...` covers it. Revisit if CI time or package count grows.
- **Web as a third app** - rejected. The web build compiles the same renderer source for a browser runtime, so it is a build variant of the desktop app, not an independently deployable unit.
- **One `@feishin/shared` package** - rejected. Mixing framework-free and React/Mantine code in one entry defeats tree-shaking and hides the core→ui dependency direction.
