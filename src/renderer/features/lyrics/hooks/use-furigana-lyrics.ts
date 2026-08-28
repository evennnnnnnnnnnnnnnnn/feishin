import { useQuery } from '@tanstack/react-query';

import * as lyricsApi from '/@/lyrics-conversion-api';
import {
    buildLinePieces,
    FuriganaBinding,
    getLineBindings,
    LinePiece,
} from '/@/renderer/features/lyrics/api/furigana-render-model';
import {
    alignFuriganaToWordCues,
    alignRomajiTokensToWordCues,
    buildWordAwareLineHtml,
    LyricTextToken,
    RomajiToken,
} from '/@/renderer/features/lyrics/api/lyric-conversion';
import { normalizeLyrics } from '/@/renderer/features/lyrics/api/lyrics-utils';
import { LyricsResponse, SyncedCueLine, SynchronizedLyrics } from '/@/shared/types/domain-types';

type InteractiveLineOptions = {
    /** Emit binding-aware kanji spans and cue-line furigana (enableFurigana) */
    furigana: boolean;
    /** Emit JMdict word-lookup spans around Japanese tokens (enableWordLookup) */
    wordSpans: boolean;
};

// Line-level text (line.text) is the primary interactive lyrics view
// (SynchronizedLyrics/UnsynchronizedLyrics -> LyricLine) and is made
// binding-aware and click-to-bind here. cueLines (word-cue/karaoke display)
// keep the pre-existing auto-furigana-only conversion: karaoke click-to-bind
// is out of scope for this pass (see Task 006 Task Log).
const convertSyncedLyricsFurigana = async (
    lyrics: SynchronizedLyrics,
    bindings: FuriganaBinding[],
    bindingsVisible: boolean,
    options: InteractiveLineOptions,
): Promise<SynchronizedLyrics> => {
    const normalized = normalizeLyrics(lyrics);

    return Promise.all(
        normalized.map(async (line, lineIndex) => {
            const lineText = line.text;
            let linePieces: LinePiece[] | null = null;

            if (options.furigana) {
                const [lineTokens = []] = await lyricsApi.analyzeLyricsLines([lineText]);
                const lineBindings = getLineBindings(bindings, lineIndex, lineText);
                linePieces = buildLinePieces(lineText, lineTokens, lineBindings);
            }

            const wordTokens = options.wordSpans
                ? ((await lyricsApi.parseLyricsTextTokens(lineText)) as LyricTextToken[])
                : null;

            return {
                ...line,
                cueLines:
                    options.furigana && line.cueLines
                        ? await Promise.all(
                              line.cueLines.map(async (cueLine) => {
                                  const tokens = (await lyricsApi.parseLyricsTextTokens(
                                      cueLine.value,
                                  )) as LyricTextToken[];
                                  const alignedWords = cueLine.words.length
                                      ? await alignFuriganaToWordCues(
                                            cueLine.value,
                                            cueLine.words,
                                            tokens,
                                            (text) => lyricsApi.convertFuriganaFragment(text),
                                        )
                                      : cueLine.words;
                                  return {
                                      ...cueLine,
                                      value: await lyricsApi.convertFurigana(cueLine.value),
                                      words: alignedWords ?? cueLine.words,
                                  };
                              }),
                          )
                        : line.cueLines,
                text: buildWordAwareLineHtml(lineText, linePieces, wordTokens, bindingsVisible),
            };
        }),
    );
};

// Interactive conversion of unsynchronized (plain string) lyrics. Line index is
// the split index, which is exactly what UnsynchronizedLyrics renders against
// and what a furigana binding's line_index means, so bindings address the same
// lines here as they do on the synced path.
const convertPlainLyricsInteractive = async (
    lyrics: string,
    bindings: FuriganaBinding[],
    bindingsVisible: boolean,
    options: InteractiveLineOptions,
): Promise<string> => {
    const lines = lyrics.split('\n');

    const converted = await Promise.all(
        lines.map(async (lineText, lineIndex) => {
            let linePieces: LinePiece[] | null = null;

            if (options.furigana) {
                const [lineTokens = []] = await lyricsApi.analyzeLyricsLines([lineText]);
                const lineBindings = getLineBindings(bindings, lineIndex, lineText);
                linePieces = buildLinePieces(lineText, lineTokens, lineBindings);
            }

            const wordTokens = options.wordSpans
                ? ((await lyricsApi.parseLyricsTextTokens(lineText)) as LyricTextToken[])
                : null;

            return buildWordAwareLineHtml(lineText, linePieces, wordTokens, bindingsVisible);
        }),
    );

    return converted.join('\n');
};

const convertSyncedLyricsRomaji = async (
    lyrics: SynchronizedLyrics,
    convert: (text: string) => Promise<string>,
): Promise<SynchronizedLyrics> =>
    Promise.all(
        normalizeLyrics(lyrics).map(async (line) => ({
            ...line,
            cueLines: line.cueLines
                ? await Promise.all(
                      line.cueLines.map(async (cueLine) => ({
                          ...cueLine,
                          value: await convert(cueLine.value),
                          words: await Promise.all(
                              cueLine.words.map(async (word) => ({
                                  ...word,
                                  text: await convert(word.text),
                              })),
                          ),
                      })),
                  )
                : undefined,
            text: await convert(line.text),
        })),
    );

export const useFuriganaLyrics = (
    lyrics: LyricsResponse | null | undefined,
    enabled: boolean,
    bindings: FuriganaBinding[] = [],
    bindingsVisible = true,
    wordLookupEnabled = false,
) => {
    const anyEnabled = enabled || wordLookupEnabled;

    return useQuery({
        enabled: anyEnabled && !!lyrics,
        queryFn: async () => {
            if (!lyrics || !anyEnabled) return lyrics;

            const options = { furigana: enabled, wordSpans: wordLookupEnabled };

            if (typeof lyrics === 'string') {
                return convertPlainLyricsInteractive(lyrics, bindings, bindingsVisible, options);
            }

            if (Array.isArray(lyrics)) {
                return convertSyncedLyricsFurigana(lyrics, bindings, bindingsVisible, options);
            }

            return lyrics;
        },
        queryKey: ['furigana', lyrics, bindings, bindingsVisible, enabled, wordLookupEnabled],
        staleTime: Infinity,
    });
};

export const useRomajiLyrics = (lyrics: LyricsResponse | null | undefined, enabled: boolean) => {
    return useQuery({
        enabled: enabled && !!lyrics,
        queryFn: async () => {
            if (!lyrics || !enabled) return lyrics;

            if (typeof lyrics === 'string') {
                return await lyricsApi.convertRomaji(lyrics);
            }

            if (Array.isArray(lyrics)) {
                return convertSyncedLyricsRomaji(lyrics, (text) => lyricsApi.convertRomaji(text));
            }

            return lyrics;
        },
        queryKey: ['romaji', lyrics],
        staleTime: Infinity,
    });
};

export type SyncedRomajiLyrics = ((null | SyncedCueLine)[] | null)[];

const buildSyncedRomajiLine = async (
    cueLines: SyncedCueLine[],
): Promise<(null | SyncedCueLine)[]> => {
    const romajiCueLines: (null | SyncedCueLine)[] = [];

    for (const cueLine of cueLines) {
        if (!cueLine.words.length) {
            romajiCueLines.push(null);
            continue;
        }

        const tokens = (await lyricsApi.convertRomajiTokens(cueLine.value)) as RomajiToken[];
        if (!tokens.length) {
            romajiCueLines.push(null);
            continue;
        }

        const alignedWords = alignRomajiTokensToWordCues(cueLine.value, cueLine.words, tokens);

        if (!alignedWords) {
            romajiCueLines.push(null);
            continue;
        }

        romajiCueLines.push({
            ...cueLine,
            words: alignedWords,
        });
    }

    return romajiCueLines;
};

export const useSyncedRomajiLyrics = (
    lyrics: null | SynchronizedLyrics | undefined,
    enabled: boolean,
) => {
    return useQuery({
        enabled: enabled && !!lyrics,
        queryFn: async (): Promise<null | SyncedRomajiLyrics> => {
            if (!lyrics || !enabled) {
                return null;
            }

            const result: SyncedRomajiLyrics = [];

            for (const line of lyrics) {
                if (
                    !line.cueLines?.length ||
                    !line.cueLines.some((cueLine) => cueLine.words.length)
                ) {
                    result.push(null);
                    continue;
                }

                const romajiCueLines = await buildSyncedRomajiLine(line.cueLines);
                result.push(romajiCueLines.some((entry) => entry !== null) ? romajiCueLines : null);
            }

            return result;
        },
        queryKey: ['romaji-synced', lyrics],
        staleTime: Infinity,
    });
};
