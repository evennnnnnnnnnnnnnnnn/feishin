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
// span (data-word-start) wins over its enclosing line (data-lyric-time).
// Times are raw lyric milliseconds, consistent with the existing line seek.
export const resolveLyricsSeekTargetMs = (
    wordStart: string | undefined,
    lyricTime: string | undefined,
): null | number => {
    if (wordStart !== undefined) {
        const wordMs = Number(wordStart);
        if (Number.isFinite(wordMs)) {
            return wordMs;
        }
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
