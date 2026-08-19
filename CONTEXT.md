# Feishin

Feishin is a cross-platform music player (Electron desktop app + a remote-control PWA) that streams from Jellyfin, Navidrome, and Subsonic servers. This repo is a pnpm-workspace monorepo.

## Language

### Workspace shape

**App**:
A deployable target built and shipped on its own: the desktop app (repo root) or the remote PWA (`apps/remote`). An app owns its build config and entry points.
_Avoid_: package, module, service

**Package**:
Consumed source code that apps depend on but is not itself deployed (`packages/*`: core, ui, i18n, lyrics-conversion). Imported as `@feishin/<name>`; has no build output of its own.
_Avoid_: lib, module, component library

**Build variant**:
A second output of the same app source for a different runtime - e.g. the browser/web build of the desktop renderer (`web.vite.config.ts`). Not an App and not a Package.
_Avoid_: app, package, target

### Shared code layers

**Core**:
The framework-free layer: domain types, server API normalization (Jellyfin/Navidrome/Subsonic), constants, logging. No React or Mantine. Everything may depend on Core.
_Avoid_: shared, common, base, models

**UI**:
The React + Mantine presentation layer: wrapped components, hooks, themes. Depends on Core, never the reverse.
_Avoid_: shared, views, widgets
