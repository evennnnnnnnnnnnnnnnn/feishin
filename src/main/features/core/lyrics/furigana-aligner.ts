// Ported from the Museeks reference implementation
// (src-tauri/src/plugins/furigana.rs, split_runs/align_runs/to_segments).

export type FuriganaSegment = {
    /** Reading in hiragana, null for kana/latin runs (or when unknown) */
    reading: null | string;
    text: string;
};

/** A token (word) of a lyric line, as segmented by the morphological analyzer */
export type FuriganaToken = {
    /** Full-token reading in hiragana, null when the analyzer has none */
    reading: null | string;
    segments: FuriganaSegment[];
    /** Codepoint (not UTF-16 code unit) offset of the token within its line */
    start: number;
    text: string;
};

/** A maximal run of kana or non-kana characters within a token */
type Run = {
    kana: boolean;
    text: string;
};

const HIRAGANA_RANGE: [number, number] = [0x3040, 0x309f];
const KATAKANA_RANGE: [number, number] = [0x30a0, 0x30ff];
const HALFWIDTH_KATAKANA_RANGE: [number, number] = [0xff66, 0xff9d];
const KATAKANA_SMALL_A_TO_KE_RANGE: [number, number] = [0x30a1, 0x30f6];
const KATAKANA_TO_HIRAGANA_SHIFT = 0x60;

const inRange = (code: number, [start, end]: [number, number]): boolean =>
    code >= start && code <= end;

export const isKana = (char: string): boolean => {
    const code = char.codePointAt(0) ?? 0;
    return (
        inRange(code, HIRAGANA_RANGE) ||
        inRange(code, KATAKANA_RANGE) ||
        inRange(code, HALFWIDTH_KATAKANA_RANGE)
    );
};

export const kataToHira = (text: string): string =>
    Array.from(text)
        .map((char) => {
            const code = char.codePointAt(0) ?? 0;
            return inRange(code, KATAKANA_SMALL_A_TO_KE_RANGE)
                ? String.fromCodePoint(code - KATAKANA_TO_HIRAGANA_SHIFT)
                : char;
        })
        .join('');

export const splitRuns = (text: string): Run[] => {
    const runs: Run[] = [];

    for (const char of Array.from(text)) {
        const kana = isKana(char);
        const lastRun = runs[runs.length - 1];

        if (lastRun && lastRun.kana === kana) {
            lastRun.text += char;
        } else {
            runs.push({ kana, text: char });
        }
    }

    return runs;
};

// Distribute `reading` (hiragana) over the token's runs: kana runs must match
// the reading literally, non-kana runs absorb what lies between them.
// Backtracks over ambiguous splits; returns one reading per run (null = kana).
const backtrack = (runs: Run[], reading: string[], acc: (null | string)[]): boolean => {
    if (runs.length === 0) {
        return reading.length === 0;
    }

    const [run, ...restRuns] = runs;

    if (run.kana) {
        const hira = Array.from(kataToHira(run.text));
        if (reading.length >= hira.length && hira.every((char, index) => reading[index] === char)) {
            acc.push(null);
            if (backtrack(restRuns, reading.slice(hira.length), acc)) {
                return true;
            }
            acc.pop();
        }
        return false;
    }

    // Non-kana run: it must absorb at least one reading char, and enough
    // must remain for the runs after it
    for (let len = 1; len <= reading.length; len += 1) {
        acc.push(reading.slice(0, len).join(''));
        if (backtrack(restRuns, reading.slice(len), acc)) {
            return true;
        }
        acc.pop();
    }

    return false;
};

export const alignRuns = (runs: Run[], reading: string[]): (null | string)[] | null => {
    const acc: (null | string)[] = [];
    return backtrack(runs, reading, acc) ? acc : null;
};

// Split a token into segments, aligning its reading onto the kanji runs
// (e.g. 振り返る/ふりかえる -> 振[ふ] り 返[かえ] る)
export const toSegments = (surface: string, reading: null | string): FuriganaSegment[] => {
    const runs = splitRuns(surface);

    if (reading) {
        const aligned = alignRuns(runs, Array.from(reading));

        if (aligned) {
            return runs.map((run, index) => ({
                reading: aligned[index],
                text: run.text,
            }));
        }
    }

    // No reading or alignment failed: one segment, the token's reading (if
    // any) attached when the token contains non-kana at all
    const hasNonKana = runs.some((run) => !run.kana);

    return [
        {
            reading: hasNonKana ? reading : null,
            text: surface,
        },
    ];
};
