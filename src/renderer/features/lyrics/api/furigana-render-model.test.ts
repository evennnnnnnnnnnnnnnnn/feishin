import { describe, expect, it } from 'vitest';

import type { FuriganaToken } from '../../../../main/features/core/lyrics/furigana';

import {
    buildLinePieces,
    FuriganaBinding,
    getLineBindings,
    getSpanSuggestedReading,
    isBindingValid,
    removeBindingFromList,
    upsertBindingInList,
} from './furigana-render-model';

const makeBinding = (overrides: Partial<FuriganaBinding> = {}): FuriganaBinding => ({
    char_offset: 0,
    created_at: '2026-08-28T00:00:00Z',
    display: true,
    id: 'b1',
    kanji_text: '漢',
    line_index: 0,
    media_file_id: 'song1',
    reading: 'かん',
    span_length: 1,
    updated_at: '2026-08-28T00:00:00Z',
    user_id: 'user1',
    ...overrides,
});

describe('isBindingValid', () => {
    it('accepts a binding whose anchor text still matches', () => {
        const binding = makeBinding({ char_offset: 1, kanji_text: '字', span_length: 1 });
        expect(isBindingValid(binding, '漢字です')).toBe(true);
    });

    it('rejects a stale binding whose anchor text no longer matches', () => {
        const binding = makeBinding({ char_offset: 1, kanji_text: '字', span_length: 1 });
        expect(isBindingValid(binding, '漢語です')).toBe(false);
    });
});

describe('getLineBindings', () => {
    it('drops stale-anchor bindings', () => {
        const bindings = [makeBinding({ char_offset: 0, kanji_text: '漢', line_index: 0 })];
        expect(getLineBindings(bindings, 0, '違う字です')).toEqual([]);
    });

    it('keeps only bindings for the requested line', () => {
        const bindings = [
            makeBinding({ char_offset: 0, kanji_text: '漢', line_index: 0 }),
            makeBinding({ char_offset: 0, kanji_text: '漢', line_index: 1 }),
        ];
        expect(getLineBindings(bindings, 1, '漢字')).toHaveLength(1);
    });

    it('drops the later of two overlapping bindings on the same line', () => {
        const bindings = [
            makeBinding({ char_offset: 0, id: 'a', kanji_text: '振り', span_length: 2 }),
            makeBinding({ char_offset: 1, id: 'b', kanji_text: 'り', span_length: 1 }),
        ];
        const result = getLineBindings(bindings, 0, '振り返る');
        expect(result.map((b) => b.id)).toEqual(['a']);
    });
});

describe('getSpanSuggestedReading', () => {
    const tokens: FuriganaToken[] = [
        {
            reading: 'ふりかえる',
            segments: [
                { reading: 'ふ', text: '振' },
                { reading: null, text: 'り' },
                { reading: 'かえ', text: '返' },
                { reading: null, text: 'る' },
            ],
            start: 0,
            text: '振り返る',
        },
    ];

    it('returns a single run reading directly', () => {
        expect(getSpanSuggestedReading(tokens, 0, 1)).toBe('ふ');
        expect(getSpanSuggestedReading(tokens, 2, 1)).toBe('かえ');
    });

    it('returns null when the span does not exactly cover whole kanji runs (spans a kana gap)', () => {
        expect(getSpanSuggestedReading(tokens, 0, 3)).toBeNull();
        expect(getSpanSuggestedReading(tokens, 1, 1)).toBeNull();
    });

    it('joins the aligned reading across adjacent kanji runs with no kana between', () => {
        const adjacent: FuriganaToken[] = [
            { reading: 'だい', segments: [{ reading: 'だい', text: '大' }], start: 0, text: '大' },
            {
                reading: 'しょう',
                segments: [{ reading: 'しょう', text: '小' }],
                start: 1,
                text: '小',
            },
        ];
        expect(getSpanSuggestedReading(adjacent, 0, 2)).toBe('だいしょう');
    });
});

describe('buildLinePieces', () => {
    const tokens: FuriganaToken[] = [
        {
            reading: 'かんじ',
            segments: [{ reading: 'かんじ', text: '漢字' }],
            start: 0,
            text: '漢字',
        },
    ];

    it('renders a plain-only line as one plain piece', () => {
        expect(buildLinePieces('hello', [], [])).toEqual([{ kind: 'plain', text: 'hello' }]);
    });

    it('renders an analyzer-suggested kanji run when no binding exists', () => {
        const pieces = buildLinePieces('漢字', tokens, []);
        expect(pieces).toEqual([
            {
                binding: null,
                charOffset: 0,
                kind: 'kanji',
                spanLength: 2,
                suggestedReading: 'かんじ',
                text: '漢字',
            },
        ]);
    });

    it('lets a binding win over an overlapping analyzer run', () => {
        const binding = makeBinding({
            char_offset: 0,
            kanji_text: '漢字',
            reading: 'さだめ',
            span_length: 2,
        });
        const pieces = buildLinePieces('漢字', tokens, [binding]);
        expect(pieces).toEqual([
            {
                binding,
                charOffset: 0,
                kind: 'kanji',
                spanLength: 2,
                suggestedReading: null,
                text: '漢字',
            },
        ]);
    });

    it('drops a stale-anchor binding out of the render (analyzer run still shows)', () => {
        const stale = makeBinding({ char_offset: 0, kanji_text: '違う', span_length: 2 });
        const pieces = buildLinePieces('漢字', tokens, getLineBindings([stale], 0, '漢字'));
        expect(pieces).toEqual([
            {
                binding: null,
                charOffset: 0,
                kind: 'kanji',
                spanLength: 2,
                suggestedReading: 'かんじ',
                text: '漢字',
            },
        ]);
    });

    it('interleaves plain text around a bound kanji span', () => {
        const binding = makeBinding({ char_offset: 1, kanji_text: '生', span_length: 1 });
        const pieces = buildLinePieces('a生b', [], [binding]);
        expect(pieces).toEqual([
            { kind: 'plain', text: 'a' },
            {
                binding,
                charOffset: 1,
                kind: 'kanji',
                spanLength: 1,
                suggestedReading: null,
                text: '生',
            },
            { kind: 'plain', text: 'b' },
        ]);
    });
});

describe('upsertBindingInList / removeBindingFromList', () => {
    it('replaces any binding overlapping the new one on the same line', () => {
        const existing = [makeBinding({ char_offset: 0, id: 'old', span_length: 2 })];
        const next = makeBinding({ char_offset: 1, id: 'new', span_length: 1 });
        const result = upsertBindingInList(existing, next);
        expect(result.map((b) => b.id)).toEqual(['new']);
    });

    it('leaves non-overlapping bindings untouched', () => {
        const existing = [makeBinding({ char_offset: 0, id: 'a', span_length: 1 })];
        const next = makeBinding({ char_offset: 5, id: 'b', span_length: 1 });
        const result = upsertBindingInList(existing, next);
        expect(result.map((b) => b.id).sort()).toEqual(['a', 'b']);
    });

    it('removes a binding by (line_index, char_offset)', () => {
        const existing = [
            makeBinding({ char_offset: 0, id: 'a', line_index: 0 }),
            makeBinding({ char_offset: 1, id: 'b', line_index: 0 }),
        ];
        const result = removeBindingFromList(existing, 0, 0);
        expect(result.map((b) => b.id)).toEqual(['b']);
    });
});
