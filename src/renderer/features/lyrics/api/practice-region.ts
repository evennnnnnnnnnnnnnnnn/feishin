// Relative import keeps this module resolvable under vitest, which has no
// /@/ alias config (same pattern as lyric-conversion.ts and its test)
import { getLineEndMs, getLyricLineStartMs } from './lyrics-utils';

import { SynchronizedLyrics } from '/@/shared/types/domain-types';

export type PracticeLoop = {
    aIndex: number;
    bIndex: number;
    endMs: number;
    startMs: number;
};

export type PracticeRegion = {
    endMs: number;
    startMs: number;
};

// Shared resolver for the lyrics click-to-seek dataset attributes: a cue-word
// span (data-word-start) wins over its enclosing line (data-lyric-time), and
// an invalid word cue swallows the click rather than falling back to the line
// (exact pre-existing karaoke handler behaviour). Times are raw lyric
// milliseconds, consistent with the existing line seek.
export const resolveLyricsSeekTargetMs = (
    wordStart: string | undefined,
    lyricTime: string | undefined,
): null | number => {
    if (wordStart !== undefined) {
        const wordMs = Number(wordStart);
        return Number.isFinite(wordMs) ? wordMs : null;
    }

    if (lyricTime !== undefined) {
        const lineMs = Number(lyricTime);
        if (Number.isFinite(lineMs) && lineMs >= 0) {
            return lineMs;
        }
    }

    return null;
};

// A line's practice region spans from its own start to where the next lyric
// takes over: word-cue lines know their real end (getLineEndMs), plain synced
// lines end at the next line's start, and the last line runs to the song end
// (Infinity when the duration is unknown; song change clears regions anyway).
export const deriveLineRegion = (
    lyrics: SynchronizedLyrics,
    index: number,
    songDurationMs?: number,
): null | PracticeRegion => {
    const line = lyrics[index];
    if (!line) {
        return null;
    }

    const startMs = getLyricLineStartMs(line);
    const cueEndMs = getLineEndMs(line);
    if (cueEndMs > startMs) {
        return { endMs: cueEndMs, startMs };
    }

    for (let idx = index + 1; idx < lyrics.length; idx += 1) {
        const nextStartMs = getLyricLineStartMs(lyrics[idx]);
        if (nextStartMs > startMs) {
            return { endMs: nextStartMs, startMs };
        }
    }

    return {
        endMs:
            songDurationMs !== undefined && songDurationMs > startMs
                ? songDurationMs
                : Number.POSITIVE_INFINITY,
        startMs,
    };
};

// Loop endpoints picked in either order produce the same loop: A is the
// earlier line's start, B is the later line's region end. A single line is a
// valid one-line loop.
export const derivePracticeLoop = (
    lyrics: SynchronizedLyrics,
    lineIndexA: number,
    lineIndexB: number,
    songDurationMs?: number,
): null | PracticeLoop => {
    const aIndex = Math.min(lineIndexA, lineIndexB);
    const bIndex = Math.max(lineIndexA, lineIndexB);

    const startRegion = deriveLineRegion(lyrics, aIndex, songDurationMs);
    const endRegion = deriveLineRegion(lyrics, bIndex, songDurationMs);
    if (!startRegion || !endRegion) {
        return null;
    }

    return {
        aIndex,
        bIndex,
        endMs: endRegion.endMs,
        startMs: startRegion.startMs,
    };
};

export type PracticeAnchor = {
    /** Wall-clock ms (performance.now) when timeMs was observed */
    at: number;
    /** Playback position in lyric ms at the anchor moment */
    timeMs: number;
};

// Interpolated playback position between progress events: wall-clock elapsed
// scaled by the playback rate.
export const interpolateAnchorMs = (anchor: PracticeAnchor, nowMs: number, speed: number): number =>
    anchor.timeMs + (nowMs - anchor.at) * speed;

export const MAX_SETTLE_MS = 500;
export const MIN_SETTLE_MS = 100;

// How long to ignore boundary checks after a watcher-issued loop seek, so
// stale progress events cannot fire a seek storm. Capped at half the loop
// length so very short loops still enforce their B boundary every cycle.
export const loopSettleMs = (loop: PracticeRegion): number => {
    const half = (loop.endMs - loop.startMs) / 2;
    return Math.max(MIN_SETTLE_MS, Math.min(MAX_SETTLE_MS, half));
};

export type PracticeTickAction = null | { type: 'loop-seek' } | { type: 'replay-end' };

// Single decision point for the player-level watcher: an active replay owns
// the transport until its end, then the loop (if any) resumes control. Only
// the B boundary is enforced; seeking before A on purpose is allowed.
export const resolvePracticeTick = (
    loop: null | PracticeRegion,
    replay: null | PracticeRegion,
    timeMs: number,
): PracticeTickAction => {
    if (replay) {
        return timeMs >= replay.endMs ? { type: 'replay-end' } : null;
    }

    if (loop && timeMs >= loop.endMs) {
        return { type: 'loop-seek' };
    }

    return null;
};
