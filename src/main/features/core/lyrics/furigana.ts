import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';
import { hasJapanese, kanaToRomaji, patchTokens } from 'kuroshiro/lib/util';

import { FuriganaSegment, FuriganaToken, isKana, kataToHira, toSegments } from './furigana-aligner';

// doc: https://kuroshiro.org

export type { FuriganaSegment, FuriganaToken };
export { kataToHira };

export type LyricTextToken = {
    /** Dictionary base (plain) form, null when the analyzer has none */
    basicForm: null | string;
    endChar: number;
    /** Part-of-speech, as reported by the analyzer */
    pos: null | string;
    /** Full-token reading in hiragana, null when the analyzer has none */
    reading: null | string;
    startChar: number;
    text: string;
};

export type RomajiToken = LyricTextToken & {
    romaji: string;
};

type RawKuromojiToken = {
    basic_form: string;
    pos: string;
    pronunciation?: string;
    reading: string;
    surface_form: string;
};

const readingToHira = (reading: string | undefined): null | string =>
    reading && reading !== '*' ? kataToHira(reading) : null;

const dictionaryField = (value: string | undefined): null | string =>
    value && value !== '*' ? value : null;

const isAsciiChar = (char: string): boolean => (char.codePointAt(0) ?? 0) < 0x80;

let kuroshiroInstance: any = null;
let initPromise: null | Promise<void> = null;

const getDictionaryPath = (): string | undefined => {
    if (typeof document === 'undefined') {
        return undefined;
    }

    return new URL('./assets/kuromoji/', document.baseURI).href;
};

const getKuroshiro = async () => {
    if (initPromise) {
        await initPromise;
        return kuroshiroInstance;
    }

    if (kuroshiroInstance) return kuroshiroInstance;

    const KuroshiroClass = (Kuroshiro as any).default || Kuroshiro;
    const dictionaryPath = getDictionaryPath();
    const analyzer = dictionaryPath
        ? new KuromojiAnalyzer({ dictPath: dictionaryPath })
        : new KuromojiAnalyzer();

    kuroshiroInstance = new KuroshiroClass();
    initPromise = kuroshiroInstance.init(analyzer);
    await initPromise;

    initPromise = null;
    return kuroshiroInstance;
};

export const convertFurigana = async (text: string): Promise<string> => {
    if (typeof text !== 'string' || !text) {
        return text;
    }

    const KuroshiroClass = (Kuroshiro as any).default || Kuroshiro;

    // check if the text contains any Japanese kana (to distinguish Japanese from Chinese text, which shares Kanji)
    // If no Japanese kana is detected, skip processing
    if (!KuroshiroClass.Util.hasKana(text)) return text;

    try {
        const kuroshiro = await getKuroshiro();
        return await kuroshiro.convert(text, { mode: 'furigana', to: 'hiragana' });
    } catch (e) {
        console.error('Furigana conversion error: ', e);
        return text;
    }
};

export const convertFuriganaFragment = async (text: string): Promise<string> => {
    if (typeof text !== 'string' || !text) {
        return text;
    }

    if (!hasJapanese(text)) {
        return text;
    }

    try {
        const kuroshiro = await getKuroshiro();
        return await kuroshiro.convert(text, { mode: 'furigana', to: 'hiragana' });
    } catch (e) {
        console.error('Furigana fragment conversion error: ', e);
        return text;
    }
};

export const convertRomaji = async (text: string): Promise<string> => {
    if (typeof text !== 'string' || !text) {
        return text;
    }

    const KuroshiroClass = (Kuroshiro as any).default || Kuroshiro;

    if (!KuroshiroClass.Util.hasKana(text)) return '';

    try {
        const kuroshiro = await getKuroshiro();
        return await kuroshiro.convert(text, { mode: 'spaced', to: 'romaji' });
    } catch (e) {
        console.error('Romaji conversion error: ', e);
        return '';
    }
};

export const parseLyricsTextTokens = async (text: string): Promise<LyricTextToken[]> => {
    if (typeof text !== 'string' || !text || !hasJapanese(text)) {
        return [];
    }

    try {
        const kuroshiro = await getKuroshiro();
        const rawTokens = await kuroshiro._analyzer.parse(text);
        const tokens = patchTokens(rawTokens);

        let cursor = 0;

        return tokens.map((token: RawKuromojiToken) => {
            const surface = token.surface_form;
            const startChar = cursor;
            cursor += surface.length;

            return {
                basicForm: dictionaryField(token.basic_form),
                endChar: cursor,
                pos: dictionaryField(token.pos),
                reading: readingToHira(token.reading),
                startChar,
                text: surface,
            };
        });
    } catch (e) {
        console.error('Lyrics token parse error: ', e);
        return [];
    }
};

export const convertRomajiTokens = async (text: string): Promise<RomajiToken[]> => {
    if (typeof text !== 'string' || !text) {
        return [];
    }

    const KuroshiroClass = (Kuroshiro as any).default || Kuroshiro;

    if (!KuroshiroClass.Util.hasKana(text)) {
        return [];
    }

    try {
        const kuroshiro = await getKuroshiro();
        const rawTokens = await kuroshiro._analyzer.parse(text);
        const tokens = patchTokens(rawTokens);

        let cursor = 0;

        return tokens.map((token: RawKuromojiToken) => {
            const surface = token.surface_form;
            const startChar = cursor;
            cursor += surface.length;

            const romaji = hasJapanese(surface)
                ? kanaToRomaji(token.pronunciation || token.reading)
                : surface;

            return {
                basicForm: dictionaryField(token.basic_form),
                endChar: cursor,
                pos: dictionaryField(token.pos),
                reading: readingToHira(token.reading),
                romaji,
                startChar,
                text: surface,
            };
        });
    } catch (e) {
        console.error('Romaji token conversion error: ', e);
        return [];
    }
};

export const analyzeLyricsLines = async (lines: string[]): Promise<FuriganaToken[][]> => {
    try {
        const kuroshiro = await getKuroshiro();

        return await Promise.all(
            lines.map(async (line) => {
                const rawTokens = await kuroshiro._analyzer.parse(line);
                const tokens = patchTokens(rawTokens) as RawKuromojiToken[];

                const lineTokens: FuriganaToken[] = [];
                let charOffset = 0;

                for (const token of tokens) {
                    const surface = token.surface_form;
                    const chars = Array.from(surface);

                    // Kana-only and readingless-symbol tokens need no annotation,
                    // but still advance the offset
                    const isAnnotatable = chars.some((char) => !isKana(char) && !isAsciiChar(char));

                    if (isAnnotatable) {
                        const reading = readingToHira(token.reading);

                        lineTokens.push({
                            reading,
                            segments: toSegments(surface, reading),
                            start: charOffset,
                            text: surface,
                        });
                    }

                    charOffset += chars.length;
                }

                return lineTokens;
            }),
        );
    } catch (e) {
        console.error('Lyrics line analysis error: ', e);
        return lines.map(() => []);
    }
};
