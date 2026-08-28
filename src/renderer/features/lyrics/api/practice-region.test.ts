import { describe, expect, it } from 'vitest';

import {
    deriveLineRegion,
    derivePracticeLoop,
    resolveLyricsSeekTargetMs,
    resolvePracticeTick,
} from './practice-region';

import { SynchronizedLyrics } from '/@/shared/types/domain-types';

const plainLyrics: SynchronizedLyrics = [
    { startMs: 1000, text: 'line one' },
    { startMs: 5000, text: 'line two' },
    { startMs: 9000, text: 'line three' },
];

const cueLyrics: SynchronizedLyrics = [
    {
        cueLines: [
            {
                endMs: 4200,
                index: 0,
                startMs: 1000,
                value: 'word cues',
                words: [
                    { endMs: 2500, startMs: 1000, text: 'word ' },
                    { endMs: 4200, startMs: 2500, text: 'cues' },
                ],
            },
        ],
        startMs: 1000,
        text: 'word cues',
    },
    { startMs: 6000, text: 'plain line' },
];

describe('resolveLyricsSeekTargetMs', () => {
    it('prefers the word cue start over the line time', () => {
        expect(resolveLyricsSeekTargetMs('2500', '1000')).toBe(2500);
    });

    it('falls back to the line time when no word start is present', () => {
        expect(resolveLyricsSeekTargetMs(undefined, '1000')).toBe(1000);
    });

    it('falls back to the line time when the word start is not numeric', () => {
        expect(resolveLyricsSeekTargetMs('abc', '1000')).toBe(1000);
    });

    it('rejects negative line times', () => {
        expect(resolveLyricsSeekTargetMs(undefined, '-5')).toBeNull();
    });

    it('allows a word start of zero', () => {
        expect(resolveLyricsSeekTargetMs('0', '1000')).toBe(0);
    });

    it('returns null when nothing is resolvable', () => {
        expect(resolveLyricsSeekTargetMs(undefined, undefined)).toBeNull();
        expect(resolveLyricsSeekTargetMs('NaN', 'NaN')).toBeNull();
    });
});

describe('deriveLineRegion', () => {
    it('ends a plain line at the next line start', () => {
        expect(deriveLineRegion(plainLyrics, 0)).toEqual({ endMs: 5000, startMs: 1000 });
    });

    it('uses the cue end for word-cue lines', () => {
        expect(deriveLineRegion(cueLyrics, 0)).toEqual({ endMs: 4200, startMs: 1000 });
    });

    it('ends the last line at the song duration', () => {
        expect(deriveLineRegion(plainLyrics, 2, 120_000)).toEqual({
            endMs: 120_000,
            startMs: 9000,
        });
    });

    it('falls back to Infinity for the last line without a known duration', () => {
        expect(deriveLineRegion(plainLyrics, 2)).toEqual({
            endMs: Number.POSITIVE_INFINITY,
            startMs: 9000,
        });
    });

    it('skips same-timestamp successors when finding the next line start', () => {
        const duplicated: SynchronizedLyrics = [
            { startMs: 1000, text: 'a' },
            { startMs: 1000, text: 'b' },
            { startMs: 3000, text: 'c' },
        ];
        expect(deriveLineRegion(duplicated, 0)).toEqual({ endMs: 3000, startMs: 1000 });
    });

    it('returns null for an out-of-range index', () => {
        expect(deriveLineRegion(plainLyrics, 99)).toBeNull();
    });
});

describe('derivePracticeLoop', () => {
    it('spans from the A line start to the B line region end', () => {
        expect(derivePracticeLoop(plainLyrics, 0, 1, 120_000)).toEqual({
            aIndex: 0,
            bIndex: 1,
            endMs: 9000,
            startMs: 1000,
        });
    });

    it('normalizes endpoints picked in reverse order', () => {
        expect(derivePracticeLoop(plainLyrics, 1, 0, 120_000)).toEqual(
            derivePracticeLoop(plainLyrics, 0, 1, 120_000),
        );
    });

    it('supports a one-line loop', () => {
        expect(derivePracticeLoop(cueLyrics, 0, 0)).toEqual({
            aIndex: 0,
            bIndex: 0,
            endMs: 4200,
            startMs: 1000,
        });
    });
});

describe('resolvePracticeTick', () => {
    const loop = { endMs: 9000, startMs: 1000 };
    const replay = { endMs: 5000, startMs: 1000 };

    it('does nothing while inside the loop', () => {
        expect(resolvePracticeTick(loop, null, 5000)).toBeNull();
    });

    it('seeks back to the loop start at the B boundary', () => {
        expect(resolvePracticeTick(loop, null, 9000)).toEqual({ type: 'loop-seek' });
        expect(resolvePracticeTick(loop, null, 9600)).toEqual({ type: 'loop-seek' });
    });

    it('does not enforce the A boundary (deliberate seeks before A are allowed)', () => {
        expect(resolvePracticeTick(loop, null, 200)).toBeNull();
    });

    it('lets an active replay own the transport over the loop', () => {
        expect(resolvePracticeTick(loop, replay, 9600)).toEqual({ type: 'replay-end' });
        expect(resolvePracticeTick(loop, replay, 3000)).toBeNull();
    });

    it('ends the replay at its region end', () => {
        expect(resolvePracticeTick(null, replay, 5000)).toEqual({ type: 'replay-end' });
        expect(resolvePracticeTick(null, replay, 4999)).toBeNull();
    });

    it('never fires an Infinity boundary', () => {
        expect(
            resolvePracticeTick({ endMs: Number.POSITIVE_INFINITY, startMs: 0 }, null, 10 ** 9),
        ).toBeNull();
    });
});
