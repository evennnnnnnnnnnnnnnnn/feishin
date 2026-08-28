import type { LyricTextToken, RomajiToken } from '../../../../main/features/core/lyrics/furigana';
import type { LinePiece } from './furigana-render-model';

import { SyncedWordCue } from '/@/shared/types/domain-types';

export type { LyricTextToken, RomajiToken };

const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
    aStart < bEnd && bStart < aEnd;

const sliceRomajiForOverlap = (
    token: RomajiToken,
    overlapStart: number,
    overlapEnd: number,
): string => {
    const tokenLen = token.endChar - token.startChar;
    if (tokenLen <= 0 || overlapEnd <= overlapStart || !token.romaji.length) {
        return '';
    }

    const relStart = Math.max(0, overlapStart - token.startChar);
    const relEnd = Math.min(tokenLen, overlapEnd - token.startChar);
    if (relEnd <= relStart) {
        return '';
    }

    const startIdx = Math.floor((relStart / tokenLen) * token.romaji.length);
    const endIdx =
        relEnd >= tokenLen
            ? token.romaji.length
            : Math.floor((relEnd / tokenLen) * token.romaji.length);

    if (endIdx <= startIdx) {
        return token.romaji.slice(startIdx, Math.min(startIdx + 1, token.romaji.length));
    }

    return token.romaji.slice(startIdx, endIdx);
};

const findWordCueEndingToken = (
    token: RomajiToken,
    wordRanges: { end: number; start: number }[],
): number => {
    let bestIndex = -1;
    let bestEnd = -1;

    for (let index = 0; index < wordRanges.length; index += 1) {
        const range = wordRanges[index];
        const overlaps =
            range.start < token.endChar &&
            range.end > token.startChar &&
            range.end <= token.endChar;

        if (overlaps && range.end > bestEnd) {
            bestEnd = range.end;
            bestIndex = index;
        }
    }

    return bestIndex;
};

const isWhitespaceToken = (token: RomajiToken): boolean => /^\s+$/u.test(token.text);

type FuriganaToken = LyricTextToken & {
    furigana: string;
};

const KANJI_RE = /[\u4e00-\u9fff]/u;
const RUBY_BLOCK_RE = /^<ruby>([^<]*)<rp>[^<]*<\/rp><rt>([^<]*)<\/rt><rp>[^<]*<\/rp><\/ruby>$/;

const sliceReadingByProportion = (
    reading: string,
    relStart: number,
    relEnd: number,
    tokenLen: number,
): string => {
    if (tokenLen <= 0 || relEnd <= relStart || !reading.length) {
        return '';
    }

    const startIdx = Math.floor((relStart / tokenLen) * reading.length);
    const endIdx =
        relEnd >= tokenLen ? reading.length : Math.floor((relEnd / tokenLen) * reading.length);

    if (endIdx <= startIdx) {
        return reading.slice(startIdx, Math.min(startIdx + 1, reading.length));
    }

    return reading.slice(startIdx, endIdx);
};

const wrapRuby = (base: string, reading: string): string =>
    `<ruby>${base}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>`;

const buildPerCharFuriganaSegments = (tokenText: string, furiganaHtml: string): string[] => {
    const segments: string[] = [];
    let htmlCursor = 0;

    while (htmlCursor < furiganaHtml.length && segments.length < tokenText.length) {
        const rubyStart = furiganaHtml.indexOf('<ruby>', htmlCursor);

        if (rubyStart === -1 || rubyStart > htmlCursor) {
            const plainEnd = rubyStart === -1 ? furiganaHtml.length : rubyStart;
            const plain = furiganaHtml.slice(htmlCursor, plainEnd);
            for (const char of plain) {
                segments.push(char);
            }
            htmlCursor = plainEnd;
            continue;
        }

        const rubyEnd = furiganaHtml.indexOf('</ruby>', rubyStart);
        if (rubyEnd === -1) {
            break;
        }

        const rubyBlock = furiganaHtml.slice(rubyStart, rubyEnd + 7);
        const baseMatch = rubyBlock.match(RUBY_BLOCK_RE);
        if (!baseMatch) {
            htmlCursor = rubyEnd + 7;
            continue;
        }

        const [, base, reading] = baseMatch;
        if (base.length === 1) {
            segments.push(rubyBlock);
        } else {
            for (let index = 0; index < base.length; index += 1) {
                const char = base[index];
                const charReading = sliceReadingByProportion(
                    reading,
                    index,
                    index + 1,
                    base.length,
                );
                segments.push(KANJI_RE.test(char) ? wrapRuby(char, charReading) : char);
            }
        }

        htmlCursor = rubyEnd + 7;
    }

    if (segments.length === tokenText.length) {
        return segments;
    }

    return [...tokenText].map((char, index) => {
        if (!KANJI_RE.test(char)) {
            return char;
        }

        const singleRuby = furiganaHtml.match(RUBY_BLOCK_RE);
        if (singleRuby && singleRuby[1] === tokenText) {
            const charReading = sliceReadingByProportion(
                singleRuby[2],
                index,
                index + 1,
                tokenText.length,
            );
            return wrapRuby(char, charReading);
        }

        return char;
    });
};

const sliceFuriganaForOverlap = (
    token: FuriganaToken,
    overlapStart: number,
    overlapEnd: number,
): string => {
    const tokenLen = token.endChar - token.startChar;
    if (tokenLen <= 0 || overlapEnd <= overlapStart) {
        return '';
    }

    const relStart = Math.max(0, overlapStart - token.startChar);
    const relEnd = Math.min(tokenLen, overlapEnd - token.startChar);
    if (relEnd <= relStart) {
        return '';
    }

    if (relStart === 0 && relEnd === tokenLen) {
        return token.furigana;
    }

    const charSegments = buildPerCharFuriganaSegments(token.text, token.furigana);
    return charSegments.slice(relStart, relEnd).join('');
};

export const alignRomajiTokensToWordCues = (
    cueValue: string,
    words: SyncedWordCue[],
    tokens: RomajiToken[],
): null | SyncedWordCue[] => {
    const joined = words.map((word) => word.text).join('');
    if (joined.length !== cueValue.length) {
        return null;
    }

    let charOffset = 0;
    const wordRanges: { end: number; start: number }[] = [];
    const aligned: SyncedWordCue[] = [];

    for (const word of words) {
        const wordStart = charOffset;
        const wordEnd = charOffset + word.text.length;
        charOffset = wordEnd;
        wordRanges.push({ end: wordEnd, start: wordStart });

        const overlapping = tokens.filter((token) =>
            rangesOverlap(wordStart, wordEnd, token.startChar, token.endChar),
        );

        const romajiParts = overlapping
            .map((token) => {
                const overlapStart = Math.max(wordStart, token.startChar);
                const overlapEnd = Math.min(wordEnd, token.endChar);
                return sliceRomajiForOverlap(token, overlapStart, overlapEnd);
            })
            .filter((part) => part.length > 0);

        const romajiText = romajiParts.join(' ');

        aligned.push({
            ...word,
            text: romajiText,
        });
    }

    for (let tokenIndex = 0; tokenIndex < tokens.length - 1; tokenIndex += 1) {
        const token = tokens[tokenIndex];
        const nextToken = tokens[tokenIndex + 1];

        if (isWhitespaceToken(nextToken)) {
            continue;
        }

        const wordIndex = findWordCueEndingToken(token, wordRanges);
        if (wordIndex < 0) {
            continue;
        }

        const currentText = aligned[wordIndex].text;
        if (!currentText || currentText.endsWith(' ')) {
            continue;
        }

        aligned[wordIndex] = {
            ...aligned[wordIndex],
            text: `${currentText} `,
        };
    }

    return aligned;
};

const escapeHtml = (text: string): string =>
    text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const wrapKanjiSpan = (
    piece: Extract<LinePiece, { kind: 'kanji' }>,
    bindingsVisible: boolean,
): string => {
    const attrs = [
        `data-kanji-offset="${piece.charOffset}"`,
        `data-span-length="${piece.spanLength}"`,
        `data-text="${escapeHtml(piece.text)}"`,
        `data-suggested-reading="${piece.suggestedReading ? escapeHtml(piece.suggestedReading) : ''}"`,
        `data-bound="${piece.binding !== null}"`,
        'role="button"',
        'tabindex="0"',
    ];

    const reading = piece.binding !== null ? piece.binding.reading : piece.suggestedReading;

    if (piece.binding !== null) {
        const hidden = !bindingsVisible || !piece.binding.display;
        if (hidden) {
            attrs.push('data-hidden="true"');
        }
    } else if (reading && !bindingsVisible) {
        attrs.push('data-hidden="true"');
    }

    if (reading) {
        return `<span ${attrs.join(' ')}><ruby>${escapeHtml(piece.text)}<rp>(</rp><rt>${escapeHtml(reading)}</rt><rp>)</rp></ruby></span>`;
    }

    return `<span ${attrs.join(' ')}>${escapeHtml(piece.text)}</span>`;
};

/**
 * Serializes the render model (bindings win over analyzer runs, ported in
 * furigana-render-model.ts) into the same kind of ruby-HTML string the
 * existing furigana transform already produces, so it keeps flowing through
 * the sanitized dangerouslySetInnerHTML pipeline. Kanji spans (bound or not)
 * carry data-kanji-offset/data-span-length click targets for
 * event-delegated click-to-bind handling.
 */
export const buildBindingAwareLineHtml = (pieces: LinePiece[], bindingsVisible: boolean): string =>
    pieces
        .map((piece) =>
            piece.kind === 'plain' ? escapeHtml(piece.text) : wrapKanjiSpan(piece, bindingsVisible),
        )
        .join('');

const WORD_CHAR_RE = /[ぁ-ヿㇰ-ㇿ一-鿿ｦ-ﾟ]/u;

/** Only tokens with Japanese content (kana or kanji) are lookup targets; punctuation, whitespace, and ASCII runs stay plain */
export const isLookupWordToken = (token: LyricTextToken): boolean => WORD_CHAR_RE.test(token.text);

type WordRange = {
    end: number;
    start: number;
    token: LyricTextToken;
};

/**
 * Token startChar/endChar are UTF-16 offsets while the kanji piece offsets are
 * code-point based (Array.from), so word ranges are recomputed here in code
 * points from the token texts, which concatenate to the full line.
 */
const getWordRanges = (wordTokens: LyricTextToken[]): WordRange[] => {
    const ranges: WordRange[] = [];
    let cursor = 0;

    for (const token of wordTokens) {
        const length = Array.from(token.text).length;
        if (isLookupWordToken(token)) {
            ranges.push({ end: cursor + length, start: cursor, token });
        }
        cursor += length;
    }

    return ranges;
};

// Word spans are click/tap targets only (no role/tabindex): making every
// particle and kana token focusable would multiply the tab stops per song far
// beyond the existing kanji-span precedent. Keyboard access remains via the
// focusable kanji spans, whose key events fall through to the enclosing word
// span when no kanji handler is active.
const wordSpanOpenTag = (range: WordRange): string => {
    const attrs = [
        `data-word-offset="${range.start}"`,
        `data-word-length="${range.end - range.start}"`,
        `data-word-text="${escapeHtml(range.token.text)}"`,
        `data-word-base="${range.token.basicForm ? escapeHtml(range.token.basicForm) : ''}"`,
        `data-word-reading="${range.token.reading ? escapeHtml(range.token.reading) : ''}"`,
        `data-word-pos="${range.token.pos ? escapeHtml(range.token.pos) : ''}"`,
    ];

    return `<span ${attrs.join(' ')}>`;
};

type LineAtom = {
    end: number;
    html: string;
    start: number;
};

/**
 * Same serialization as buildBindingAwareLineHtml, additionally wrapping every
 * Japanese analyzer token in a word span (JMdict word-tap lookup target).
 * Kanji spans stay nested inside their word span; a binding span that crosses
 * token boundaries belongs to no word span (its glyphs are KanjiPicker
 * territory, and attributing them to either word would return the wrong
 * entry). With `pieces` null (word lookup without furigana) the text stays
 * plain inside the word spans; with `wordTokens` null the output is identical
 * to buildBindingAwareLineHtml.
 */
export const buildWordAwareLineHtml = (
    lineText: string,
    pieces: LinePiece[] | null,
    wordTokens: LyricTextToken[] | null,
    bindingsVisible: boolean,
): string => {
    const effectivePieces: LinePiece[] = pieces ?? [{ kind: 'plain', text: lineText }];
    const wordRanges = wordTokens ? getWordRanges(wordTokens) : [];

    if (!wordRanges.length) {
        return buildBindingAwareLineHtml(effectivePieces, bindingsVisible);
    }

    const atoms: LineAtom[] = [];
    let cursor = 0;

    for (const piece of effectivePieces) {
        if (piece.kind === 'kanji') {
            atoms.push({
                end: piece.charOffset + piece.spanLength,
                html: wrapKanjiSpan(piece, bindingsVisible),
                start: piece.charOffset,
            });
            cursor = piece.charOffset + piece.spanLength;
            continue;
        }

        for (const char of piece.text) {
            atoms.push({ end: cursor + 1, html: escapeHtml(char), start: cursor });
            cursor += 1;
        }
    }

    const output: string[] = [];
    let rangeIdx = 0;
    let openRange: null | WordRange = null;

    for (const atom of atoms) {
        while (rangeIdx < wordRanges.length && wordRanges[rangeIdx].end <= atom.start) {
            rangeIdx += 1;
        }

        const covering =
            rangeIdx < wordRanges.length && wordRanges[rangeIdx].start <= atom.start
                ? wordRanges[rangeIdx]
                : null;
        // An atom overhanging its word (a binding crossing token boundaries)
        // stays outside any word span
        const range = covering && atom.end <= covering.end ? covering : null;

        if (openRange !== range) {
            if (openRange) {
                output.push('</span>');
            }
            if (range) {
                output.push(wordSpanOpenTag(range));
            }
            openRange = range;
        }

        output.push(atom.html);
    }

    if (openRange) {
        output.push('</span>');
    }

    return output.join('');
};

export const alignFuriganaToWordCues = async (
    cueValue: string,
    words: SyncedWordCue[],
    tokens: LyricTextToken[],
    convertFuriganaFragment: (text: string) => Promise<string>,
): Promise<null | SyncedWordCue[]> => {
    const joined = words.map((word) => word.text).join('');
    if (joined.length !== cueValue.length) {
        return null;
    }

    const furiganaTokens: FuriganaToken[] = await Promise.all(
        tokens.map(async (token) => ({
            ...token,
            furigana: await convertFuriganaFragment(token.text),
        })),
    );

    let charOffset = 0;
    const aligned: SyncedWordCue[] = [];

    for (const word of words) {
        const wordStart = charOffset;
        const wordEnd = charOffset + word.text.length;
        charOffset = wordEnd;

        const parts: string[] = [];

        for (const token of furiganaTokens) {
            if (!rangesOverlap(wordStart, wordEnd, token.startChar, token.endChar)) {
                continue;
            }

            const overlapStart = Math.max(wordStart, token.startChar);
            const overlapEnd = Math.min(wordEnd, token.endChar);
            const furiganaPart = sliceFuriganaForOverlap(token, overlapStart, overlapEnd);

            if (!furiganaPart) {
                continue;
            }

            parts.push(furiganaPart);
        }

        aligned.push({
            ...word,
            text: parts.join('') || word.text,
        });
    }

    return aligned;
};
