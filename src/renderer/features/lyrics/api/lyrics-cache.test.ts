import { describe, expect, it } from 'vitest';

import type { LyricsQueryResult } from './lyrics-api';

import {
    lyricsResultHasLyrics,
    lyricsResultHasUserState,
    shouldPersistLyricsResult,
} from './lyrics-cache';

const emptyResult = (): LyricsQueryResult => ({
    local: null,
    overrideData: null,
    overrideSelection: null,
    remoteAuto: null,
    selected: null,
    selectedOffsetMs: 0,
    selectedStructuredIndex: 0,
    selectedSynced: false,
    suppressRemoteAuto: false,
});

const withLyrics = (): LyricsQueryResult => ({
    ...emptyResult(),
    selected: {
        artist: 'TakaseToya',
        lyrics: 'さよならの前にキスをして',
        name: 'でも、',
        remote: false,
        source: 'navidrome',
    },
});

describe('lyricsResultHasLyrics', () => {
    it('is false for undefined data', () => {
        expect(lyricsResultHasLyrics(undefined)).toBe(false);
    });

    it('is false when nothing was selected', () => {
        expect(lyricsResultHasLyrics(emptyResult())).toBe(false);
    });

    it('is true when a lyric was selected', () => {
        expect(lyricsResultHasLyrics(withLyrics())).toBe(true);
    });
});

describe('lyricsResultHasUserState', () => {
    it('is false for undefined data', () => {
        expect(lyricsResultHasUserState(undefined)).toBe(false);
    });

    it('is false for an untouched empty result', () => {
        expect(lyricsResultHasUserState(emptyResult())).toBe(false);
    });

    it('is true when the user tuned an offset', () => {
        expect(lyricsResultHasUserState({ ...emptyResult(), selectedOffsetMs: -250 })).toBe(true);
    });

    it('is true when the user picked an override', () => {
        const data: LyricsQueryResult = {
            ...emptyResult(),
            overrideSelection: {
                artist: 'TakaseToya',
                id: '9668312',
                name: 'でも、',
                remote: true,
                source: 'lrclib',
            },
        };
        expect(lyricsResultHasUserState(data)).toBe(true);
    });

    it('is true when the user suppressed remote auto-fetch', () => {
        expect(lyricsResultHasUserState({ ...emptyResult(), suppressRemoteAuto: true })).toBe(true);
    });
});

describe('shouldPersistLyricsResult', () => {
    it('does not persist a bare "no lyrics found" result', () => {
        // This is the regression: persisting it with maxAge Infinity hid every
        // sidecar or override added after the song was first opened.
        expect(shouldPersistLyricsResult(emptyResult())).toBe(false);
    });

    it('does not persist undefined data', () => {
        expect(shouldPersistLyricsResult(undefined)).toBe(false);
    });

    it('persists a result that has lyrics', () => {
        expect(shouldPersistLyricsResult(withLyrics())).toBe(true);
    });

    it('persists a lyric-less result that carries user state', () => {
        expect(shouldPersistLyricsResult({ ...emptyResult(), suppressRemoteAuto: true })).toBe(
            true,
        );
    });
});
