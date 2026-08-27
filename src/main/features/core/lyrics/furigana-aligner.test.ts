import { describe, expect, it } from 'vitest';

import { alignRuns, isKana, kataToHira, splitRuns, toSegments } from './furigana-aligner';

describe('isKana', () => {
    it('recognizes hiragana and katakana', () => {
        expect(isKana('あ')).toBe(true);
        expect(isKana('ア')).toBe(true);
    });

    it('recognizes halfwidth katakana', () => {
        expect(isKana('ｱ')).toBe(true);
    });

    it('rejects kanji and latin', () => {
        expect(isKana('漢')).toBe(false);
        expect(isKana('a')).toBe(false);
    });
});

describe('kataToHira', () => {
    it('converts katakana to hiragana', () => {
        expect(kataToHira('イキル')).toBe('いきる');
        expect(kataToHira('ラーメン')).toBe('らーめん');
    });

    it('leaves non-katakana untouched', () => {
        expect(kataToHira('漢字')).toBe('漢字');
    });
});

describe('splitRuns', () => {
    it('splits interleaved kanji/kana into maximal runs', () => {
        const runs = splitRuns('振り返る');
        expect(runs).toEqual([
            { kana: false, text: '振' },
            { kana: true, text: 'り' },
            { kana: false, text: '返' },
            { kana: true, text: 'る' },
        ]);
    });
});

describe('alignRuns', () => {
    it('backtracks so a kanji run absorbs only what is left for later runs', () => {
        const runs = splitRuns('生きる');
        const aligned = alignRuns(runs, Array.from('いきる'));
        expect(aligned).toEqual(['い', null]);
    });
});

describe('toSegments', () => {
    it('splits okurigana across a single trailing kana run (生きる/いきる)', () => {
        const segments = toSegments('生きる', 'いきる');
        expect(segments).toEqual([
            { reading: 'い', text: '生' },
            { reading: null, text: 'きる' },
        ]);
    });

    it('splits interleaved kanji/kana runs (振り返る/ふりかえる)', () => {
        const segments = toSegments('振り返る', 'ふりかえる');
        expect(segments).toEqual([
            { reading: 'ふ', text: '振' },
            { reading: null, text: 'り' },
            { reading: 'かえ', text: '返' },
            { reading: null, text: 'る' },
        ]);
    });

    it('keeps a compound reading as a single segment (今日/きょう)', () => {
        const segments = toSegments('今日', 'きょう');
        expect(segments).toEqual([{ reading: 'きょう', text: '今日' }]);
    });

    it('attaches no reading when none is given', () => {
        const segments = toSegments('漢字', null);
        expect(segments).toEqual([{ reading: null, text: '漢字' }]);
    });
});
