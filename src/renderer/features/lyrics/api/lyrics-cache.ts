import type { LyricsQueryResult } from '/@/renderer/features/lyrics/api/lyrics-api';

/**
 * Predicates deciding how long a cached lyrics result may live.
 *
 * The lyrics query is cached and persisted aggressively because its entry holds
 * more than a server response. It also carries the user's offset, override
 * selection and remote-fetch suppression. Treating every result as permanent,
 * however, freezes a "nothing found" answer forever: a `.lrc` sidecar or a
 * lyrics override added after the fact would never be picked up, because the
 * query is never stale and the negative result is restored from IndexedDB on
 * every launch.
 *
 * A result without lyrics is therefore provisional and must revalidate, while a
 * result with lyrics (or one the user has deliberately configured) keeps the
 * long-lived behaviour.
 *
 * The import above is type-only, so this module pulls in no runtime dependency
 * and is safe to use from the app entry point.
 */

/** Whether the cached result actually resolved to something displayable. */
export function lyricsResultHasLyrics(data: LyricsQueryResult | undefined): boolean {
    return Boolean(data?.selected);
}

/**
 * Whether the cached result carries user state worth keeping even with no
 * lyrics: a chosen override, a suppressed auto-fetch, or a tuned offset.
 * Discarding these would silently undo a deliberate choice.
 */
export function lyricsResultHasUserState(data: LyricsQueryResult | undefined): boolean {
    if (!data) return false;
    return (
        data.overrideSelection !== null || data.suppressRemoteAuto || data.selectedOffsetMs !== 0
    );
}

/** Whether a cached lyrics result is worth writing to the persisted cache. */
export function shouldPersistLyricsResult(data: LyricsQueryResult | undefined): boolean {
    return lyricsResultHasLyrics(data) || lyricsResultHasUserState(data);
}
