// Ported near-verbatim from the Museeks reference implementation
// (src/lib/furigana-utils.ts): binding validity, per-line binding
// resolution (stale anchors dropped, overlaps resolved), and the line
// render model (bindings win over analyzer runs).

import type { FuriganaBindingDto } from '/@/shared/types/domain-types';

import type { FuriganaToken } from '../../../../main/features/core/lyrics/furigana';

const KANJI_RE = /\p{Script=Han}/u;

export const hasKanji = (text: string): boolean => KANJI_RE.test(text);

/** Per-user reading binding for a kanji span, matching the Navidrome furigana_binding wire shape */
export type FuriganaBinding = FuriganaBindingDto;

/** A renderable piece of a lyric line: plain text, or a kanji span that is clickable and possibly annotated with a bound reading */
export type LinePiece =
    | {
          binding: FuriganaBinding | null;
          charOffset: number;
          kind: 'kanji';
          spanLength: number;
          suggestedReading: null | string;
          text: string;
      }
    | { kind: 'plain'; text: string };

/** A binding is only valid if the lyric text at its anchor still matches the text it was created for (lyrics may have been edited since) */
export const isBindingValid = (binding: FuriganaBinding, lineText: string): boolean => {
    const chars = Array.from(lineText);
    const span = chars
        .slice(binding.char_offset, binding.char_offset + binding.span_length)
        .join('');
    return span === binding.kanji_text;
};

export const getLineBindings = (
    bindings: FuriganaBinding[] | null | undefined,
    lineIndex: number,
    lineText: string,
): FuriganaBinding[] => {
    if (!bindings) {
        return [];
    }

    const valid = bindings
        .filter((binding) => binding.line_index === lineIndex && isBindingValid(binding, lineText))
        .sort((a, b) => a.char_offset - b.char_offset);

    // Drop overlaps (should not happen, but a corrupted response must not produce a broken render)
    const result: FuriganaBinding[] = [];
    let nextFree = 0;
    for (const binding of valid) {
        if (binding.char_offset >= nextFree) {
            result.push(binding);
            nextFree = binding.char_offset + binding.span_length;
        }
    }
    return result;
};

type KanjiRun = {
    charOffset: number;
    reading: null | string;
    text: string;
};

/** Kanji runs of a line as found by the analyzer: one run per token segment that contains kanji, with the segment's aligned reading */
const getKanjiRuns = (tokens: FuriganaToken[]): KanjiRun[] => {
    const runs: KanjiRun[] = [];

    for (const token of tokens) {
        let offset = token.start;
        for (const segment of token.segments) {
            if (hasKanji(segment.text)) {
                runs.push({ charOffset: offset, reading: segment.reading, text: segment.text });
            }
            offset += Array.from(segment.text).length;
        }
    }

    return runs;
};

/** The analyzer's suggested reading for an arbitrary span, when the span exactly covers whole kanji runs (used for shift-click extended spans) */
export const getSpanSuggestedReading = (
    tokens: FuriganaToken[],
    charOffset: number,
    spanLength: number,
): null | string => {
    const end = charOffset + spanLength;
    const covered = getKanjiRuns(tokens).filter(
        (run) =>
            run.charOffset >= charOffset && run.charOffset + Array.from(run.text).length <= end,
    );

    if (
        covered.length === 0 ||
        covered.some((run) => run.reading === null) ||
        covered.reduce((n, run) => n + Array.from(run.text).length, 0) !== spanLength
    ) {
        return null;
    }

    return covered.map((run) => run.reading).join('');
};

/** Build the render model for one lyric line: plain pieces interleaved with kanji spans. Bindings win over analyzer runs when they overlap. */
export const buildLinePieces = (
    lineText: string,
    tokens: FuriganaToken[] | undefined,
    bindings: FuriganaBinding[],
): LinePiece[] => {
    const chars = Array.from(lineText);

    type Span = {
        binding: FuriganaBinding | null;
        charOffset: number;
        length: number;
        suggestedReading: null | string;
    };

    const spans: Span[] = bindings.map((binding) => ({
        binding,
        charOffset: binding.char_offset,
        length: binding.span_length,
        suggestedReading: null,
    }));

    // Analyzer kanji runs fill the space bindings do not cover
    for (const run of getKanjiRuns(tokens ?? [])) {
        const runLength = Array.from(run.text).length;
        const overlaps = spans.some(
            (span) =>
                run.charOffset < span.charOffset + span.length &&
                span.charOffset < run.charOffset + runLength,
        );
        if (!overlaps) {
            spans.push({
                binding: null,
                charOffset: run.charOffset,
                length: runLength,
                suggestedReading: run.reading,
            });
        }
    }

    spans.sort((a, b) => a.charOffset - b.charOffset);

    const pieces: LinePiece[] = [];
    let cursor = 0;

    for (const span of spans) {
        if (span.charOffset > cursor) {
            pieces.push({ kind: 'plain', text: chars.slice(cursor, span.charOffset).join('') });
        }
        pieces.push({
            binding: span.binding,
            charOffset: span.charOffset,
            kind: 'kanji',
            spanLength: span.length,
            suggestedReading: span.suggestedReading,
            text: chars.slice(span.charOffset, span.charOffset + span.length).join(''),
        });
        cursor = span.charOffset + span.length;
    }

    if (cursor < chars.length) {
        pieces.push({ kind: 'plain', text: chars.slice(cursor).join('') });
    }

    return pieces;
};

/** Optimistically merge a saved binding into a query-cache bindings list: anything overlapping it on the same line is replaced */
export const upsertBindingInList = (
    bindings: FuriganaBinding[],
    binding: FuriganaBinding,
): FuriganaBinding[] => {
    const kept = bindings.filter(
        (other) =>
            other.line_index !== binding.line_index ||
            other.char_offset + other.span_length <= binding.char_offset ||
            binding.char_offset + binding.span_length <= other.char_offset,
    );

    return [...kept, binding];
};

export const removeBindingFromList = (
    bindings: FuriganaBinding[],
    lineIndex: number,
    charOffset: number,
): FuriganaBinding[] =>
    bindings.filter(
        (binding) => binding.line_index !== lineIndex || binding.char_offset !== charOffset,
    );
