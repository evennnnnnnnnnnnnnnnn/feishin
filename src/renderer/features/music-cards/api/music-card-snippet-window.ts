import type { SynchronizedLyrics, SynchronizedLyricsLineTuple } from '/@/shared/types/domain-types';

// Relative rather than the '/@/' alias on purpose: vitest runs without the
// vite alias config, so a runtime alias import here would make this module
// untestable (existing lyrics tests avoid the alias the same way).
import {
    getLineEndMs,
    getLyricLineStartMs,
    getLyricLineText,
    normalizeLyricsLine,
} from '../../lyrics/api/lyrics-utils';

/** A snippet shorter than this reads as a fragment, so it absorbs the next line */
export const MIN_SNIPPET_DURATION_MS = 3000;

export type MusicCardSnippetWindow = {
    endMs: number;
    snippetText: string;
    startMs: number;
};

type LyricsInput = SynchronizedLyrics | SynchronizedLyricsLineTuple[];

/**
 * Where a line ends: the next line's start if there is one, otherwise its own
 * word-cue end, otherwise the end of the track. Synced lyrics only carry a
 * start per line, so an end always has to be derived.
 */
const lineEndMs = (lyrics: LyricsInput, lineIndex: number, trackDurationMs: number): number => {
    const next = lyrics[lineIndex + 1];

    if (next !== undefined) {
        return getLyricLineStartMs(next);
    }

    const line = normalizeLyricsLine(lyrics[lineIndex]);
    const cueEndMs = getLineEndMs(line);

    if (cueEndMs > line.startMs) {
        return cueEndMs;
    }

    return trackDurationMs;
};

/**
 * Derive the [startMs, endMs] window and text for a card snippet anchored on
 * `lineIndex`.
 *
 * AUTO 2-LINE RULE: a one-line window shorter than {@link MIN_SNIPPET_DURATION_MS}
 * is extended through the following line, so short lines still produce a
 * snippet with enough context to be worth replaying.
 *
 * The server applies its own lead-in/lead-out padding when it cuts the clip,
 * so no padding is added here. Returns null when `lineIndex` is out of range
 * or the lyrics are unsynced.
 */
export const deriveMusicCardSnippetWindow = (
    lyrics: LyricsInput | null | undefined,
    lineIndex: number,
    trackDurationMs: number,
): MusicCardSnippetWindow | null => {
    if (!lyrics?.length || lineIndex < 0 || lineIndex >= lyrics.length) {
        return null;
    }

    const startMs = getLyricLineStartMs(lyrics[lineIndex]);
    let endMs = lineEndMs(lyrics, lineIndex, trackDurationMs);
    let snippetText = getLyricLineText(lyrics[lineIndex]);

    const nextLine = lyrics[lineIndex + 1];

    if (endMs - startMs < MIN_SNIPPET_DURATION_MS && nextLine !== undefined) {
        endMs = lineEndMs(lyrics, lineIndex + 1, trackDurationMs);
        const nextText = getLyricLineText(nextLine);
        snippetText = nextText ? `${snippetText}\n${nextText}` : snippetText;
    }

    if (trackDurationMs > 0) {
        endMs = Math.min(endMs, trackDurationMs);
    }

    if (endMs <= startMs) {
        return null;
    }

    return { endMs, snippetText, startMs };
};
