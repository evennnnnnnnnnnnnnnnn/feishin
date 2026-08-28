# Releasing this fork

Fork-local. Not upstream documentation.

## The branches

| Branch | Job |
|--------|-----|
| `jml/japanese-learning` | Daily work. Commit here. Nothing releases from it. |
| `main` | The release branch. Default branch. |
| `development` | Untouched upstream mainline, kept only for `gh repo sync`. |

## Versioning

This fork uses CalVer with the year as major: currently `2026.1.x`.

Upstream is on `1.x`, and a fork inherits upstream's tags, so `v1.15.0` and
`v1.15.1` already exist here and point at upstream commits. Any `1.x` version
would collide with one of them. A year-major version can never collide and
always sorts above upstream, which is what electron-updater needs.

## Shipping

Bump the patch in `package.json`, then merge and push:

```bash
# 2026.1.0 -> 2026.1.1
npm version --no-git-tag-version patch     # or edit package.json by hand
git add package.json && git commit -m "..."

git checkout main
git merge --ff-only jml/japanese-learning
git push origin main
git checkout jml/japanese-learning
```

**The version bump is the ship gesture.** `.github/workflows/release-jml.yml`
runs on every push to `main`, but it first checks whether a release already
exists for the version in `package.json` and does nothing if so. Pushing to
`main` without bumping is therefore safe and republishes nothing.

## What happens next

The workflow runs `pnpm run publish:linux`, which builds and publishes an
AppImage, a deb, a tar.xz and `latest-linux.yml` to a release on this fork.
`latest-linux.yml` is the updater feed; without it the installed app cannot see
the release.

`electron-builder.yml` sets `releaseType: release`, not `draft`. This matters:
electron-updater cannot see draft releases, so a draft build succeeds and then
silently never reaches the app.

## The installed app

| Path | Holds |
|------|-------|
| `~/Applications/Feishin-linux-x86_64.AppImage` | The installed app |
| `~/.local/share/applications/feishin.desktop` | The launcher entry |
| `~/.config/feishin` | **Production** config, servers, themes |
| `~/.config/feishin-dev` | **Development** config, written by `pnpm dev` |

The two config directories are separate by construction: `src/main/index.ts`
redirects `userData` to `<path>-dev` when running in development. Production
and `pnpm dev` can run at the same time without touching each other's servers,
credentials or themes.

Updates arrive on their own. `checkForUpdatesAndNotify()` runs at startup
(`src/main/index.ts`) against the release feed above, so a new release prompts
in-app. To force one:

```bash
gh release download <tag> -R evennnnnnnnnnnnnnnnn/feishin -p '*.AppImage' \
  --clobber -D ~/Applications
chmod +x ~/Applications/Feishin-linux-x86_64.AppImage
```

## Disabled upstream workflows

Three upstream workflows are disabled on this fork because they misbehave here.
Re-enable with `gh workflow enable <file> -R evennnnnnnnnnnnnnnnn/feishin`.

| Workflow | Why |
|----------|-----|
| `test.yml` | Its commitlint job fails by construction against the `[OR] wip:` commit convention this workspace uses, so every push would go red. |
| `publish-winget.yml` | Fires on release and tries to publish to winget as jeffvli. |
| `stale.yml` | Issue housekeeping for a repo with no issues. |
