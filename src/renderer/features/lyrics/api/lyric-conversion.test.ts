import { describe, expect, it } from 'vitest';

import type { LinePiece } from './furigana-render-model';

import {
    buildBindingAwareLineHtml,
    buildWordAwareLineHtml,
    isLookupWordToken,
    LyricTextToken,
} from './lyric-conversion';

const makeToken = (
    text: string,
    startChar: number,
    overrides: Partial<LyricTextToken> = {},
): LyricTextToken => ({
    basicForm: text,
    endChar: startChar + text.length,
    pos: null,
    reading: null,
    startChar,
    text,
    ...overrides,
});

describe('isLookupWordToken', () => {
    it('accepts kana, kanji, and katakana tokens', () => {
        expect(isLookupWordToken(makeToken('食べる', 0))).toBe(true);
        expect(isLookupWordToken(makeToken('は', 0))).toBe(true);
        expect(isLookupWordToken(makeToken('コーヒー', 0))).toBe(true);
    });

    it('rejects punctuation, whitespace, and ASCII tokens', () => {
        expect(isLookupWordToken(makeToken('、', 0))).toBe(false);
        expect(isLookupWordToken(makeToken(' ', 0))).toBe(false);
        expect(isLookupWordToken(makeToken('ABC', 0))).toBe(false);
        expect(isLookupWordToken(makeToken('!?', 0))).toBe(false);
    });
});

describe('buildWordAwareLineHtml', () => {
    const lineText = '猫は食べた';
    const tokens = [
        makeToken('猫', 0, { basicForm: '猫', pos: '名詞', reading: 'ねこ' }),
        makeToken('は', 1, { basicForm: 'は', pos: '助詞', reading: 'は' }),
        makeToken('食べ', 2, { basicForm: '食べる', pos: '動詞', reading: 'たべ' }),
        makeToken('た', 4, { basicForm: 'た', pos: '助動詞', reading: 'た' }),
    ];

    const kanjiPieces: LinePiece[] = [
        {
            binding: null,
            charOffset: 0,
            kind: 'kanji',
            spanLength: 1,
            suggestedReading: 'ねこ',
            text: '猫',
        },
        { kind: 'plain', text: 'は' },
        {
            binding: null,
            charOffset: 2,
            kind: 'kanji',
            spanLength: 1,
            suggestedReading: 'た',
            text: '食',
        },
        { kind: 'plain', text: 'べた' },
    ];

    it('matches buildBindingAwareLineHtml exactly when word tokens are absent', () => {
        expect(buildWordAwareLineHtml(lineText, kanjiPieces, null, true)).toBe(
            buildBindingAwareLineHtml(kanjiPieces, true),
        );
        expect(buildWordAwareLineHtml(lineText, kanjiPieces, [], false)).toBe(
            buildBindingAwareLineHtml(kanjiPieces, false),
        );
    });

    it('wraps every Japanese token in a word span carrying the token fields', () => {
        const html = buildWordAwareLineHtml(lineText, null, tokens, true);

        expect(html).toContain(
            '<span data-word-offset="0" data-word-length="1" data-word-text="猫" data-word-base="猫" data-word-reading="ねこ" data-word-pos="名詞">猫</span>',
        );
        expect(html).toContain('data-word-base="食べる"');
        expect(html).toContain('data-word-pos="助詞"');
        // Four tokens -> four word spans, no kanji spans without pieces
        expect(html.match(/data-word-offset/g)).toHaveLength(4);
        expect(html).not.toContain('data-kanji-offset');
    });

    it('nests kanji spans inside their word span', () => {
        const html = buildWordAwareLineHtml(lineText, kanjiPieces, tokens, true);

        expect(html).toContain('data-word-offset="0"');
        const wordSpanStart = html.indexOf('data-word-offset="2"');
        const kanjiSpanStart = html.indexOf('data-kanji-offset="2"');
        expect(wordSpanStart).toBeGreaterThan(-1);
        expect(kanjiSpanStart).toBeGreaterThan(wordSpanStart);
    });

    it('leaves punctuation and ASCII outside word spans', () => {
        const text = '猫、ABC';
        const punctTokens = [
            makeToken('猫', 0, { pos: '名詞', reading: 'ねこ' }),
            makeToken('、', 1, { basicForm: null, pos: '記号', reading: null }),
            makeToken('ABC', 2, { basicForm: null, pos: null, reading: null }),
        ];

        const html = buildWordAwareLineHtml(text, null, punctTokens, true);

        expect(html.match(/data-word-offset/g)).toHaveLength(1);
        expect(html).toContain('</span>、ABC');
    });

    it('keeps a binding that crosses token boundaries outside any word span', () => {
        // Binding spans 食 (end of token 食べ... shifted) across into the next
        // token: 猫[は][食べ]  binding over は食 (offset 1, length 2)
        const crossingPieces: LinePiece[] = [
            { kind: 'plain', text: '猫' },
            {
                binding: null,
                charOffset: 1,
                kind: 'kanji',
                spanLength: 2,
                suggestedReading: null,
                text: 'は食',
            },
            { kind: 'plain', text: 'べた' },
        ];

        const html = buildWordAwareLineHtml(lineText, crossingPieces, tokens, true);

        // The crossing kanji span sits between word spans, not inside one
        const kanjiIdx = html.indexOf('data-kanji-offset="1"');
        const before = html.slice(0, kanjiIdx);
        expect(kanjiIdx).toBeGreaterThan(-1);
        expect((before.match(/<span data-word-offset/g) ?? []).length).toBe(
            (before.match(/<\/span>/g) ?? []).length,
        );
        // The remainder of 食べ (べ at offset 3) still gets its word span
        expect(html).toContain('data-word-offset="2"');
    });

    it('computes word offsets in code points for astral characters', () => {
        const text = '𝄞猫';
        const astralTokens = [
            makeToken('𝄞', 0, { basicForm: null, pos: null, reading: null }),
            // startChar is UTF-16 based (2 for the astral clef), but the emitted
            // offset must be code-point based (1)
            makeToken('猫', 2, { pos: '名詞', reading: 'ねこ' }),
        ];

        const html = buildWordAwareLineHtml(text, null, astralTokens, true);

        expect(html).toContain('data-word-offset="1"');
        expect(html).toContain('data-word-length="1"');
    });
});
