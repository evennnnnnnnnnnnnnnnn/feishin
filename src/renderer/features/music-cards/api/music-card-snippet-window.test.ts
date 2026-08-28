import { describe, expect, it } from 'vitest';

import { deriveMusicCardSnippetWindow } from './music-card-snippet-window';

import { SynchronizedLyrics } from '/@/shared/types/domain-types';

const lyrics: SynchronizedLyrics = [
    { startMs: 0, text: 'first line' },
    { startMs: 10000, text: 'second line' },
    { startMs: 11000, text: 'short line' },
    { startMs: 14000, text: 'fourth line' },
];

describe('deriveMusicCardSnippetWindow', () => {
    it('ends a line at the next line start', () => {
        expect(deriveMusicCardSnippetWindow(lyrics, 0, 30000)).toEqual({
            endMs: 10000,
            snippetText: 'first line',
            startMs: 0,
        });
    });

    it('extends a sub-3s line through the following line', () => {
        expect(deriveMusicCardSnippetWindow(lyrics, 1, 30000)).toEqual({
            endMs: 14000,
            snippetText: 'second line\nshort line',
            startMs: 10000,
        });
    });

    it('falls back to the track duration on the last line', () => {
        expect(deriveMusicCardSnippetWindow(lyrics, 3, 30000)).toEqual({
            endMs: 30000,
            snippetText: 'fourth line',
            startMs: 14000,
        });
    });

    it('prefers a word-cue end over the track duration on the last line', () => {
        const withCues: SynchronizedLyrics = [
            {
                cueLines: [
                    {
                        endMs: 4500,
                        index: 0,
                        startMs: 0,
                        value: 'only line',
                        words: [{ endMs: 4500, startMs: 0, text: 'only line' }],
                    },
                ],
                startMs: 0,
                text: 'only line',
            },
        ];

        expect(deriveMusicCardSnippetWindow(withCues, 0, 30000)).toEqual({
            endMs: 4500,
            snippetText: 'only line',
            startMs: 0,
        });
    });

    it('clamps the window to the track duration', () => {
        expect(deriveMusicCardSnippetWindow(lyrics, 3, 14500)?.endMs).toBe(14500);
    });

    it('accepts the legacy tuple line shape', () => {
        expect(
            deriveMusicCardSnippetWindow(
                [
                    [0, 'first line'],
                    [10000, 'second line'],
                ],
                0,
                30000,
            ),
        ).toEqual({ endMs: 10000, snippetText: 'first line', startMs: 0 });
    });

    it('returns null for out-of-range, empty, or zero-length windows', () => {
        expect(deriveMusicCardSnippetWindow(lyrics, 9, 30000)).toBeNull();
        expect(deriveMusicCardSnippetWindow(lyrics, -1, 30000)).toBeNull();
        expect(deriveMusicCardSnippetWindow([], 0, 30000)).toBeNull();
        expect(deriveMusicCardSnippetWindow(null, 0, 30000)).toBeNull();
        // Last line with no cues and no known duration has nothing to end on
        expect(deriveMusicCardSnippetWindow(lyrics, 3, 0)).toBeNull();
    });
});
