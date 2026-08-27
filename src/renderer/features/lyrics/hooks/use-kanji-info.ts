import { useQuery } from '@tanstack/react-query';

// KANJIDIC2 (EDRDG, CC BY-SA 4.0) compact JSON, ported from the Museeks
// reference implementation's generator (scripts/gen-kanjidic.py).
export type KanjiInfo = {
    kun: string[];
    meanings: string[];
    on: string[];
};

type KanjiDictionary = Record<string, KanjiInfo>;

let dictionaryPromise: null | Promise<KanjiDictionary> = null;

const loadDictionary = (): Promise<KanjiDictionary> => {
    dictionaryPromise ??= import('../assets/kanjidic2-compact.json').then(
        (module) => module.default as KanjiDictionary,
    );

    return dictionaryPromise;
};

/** Lazily loads the bundled KANJIDIC2 dictionary and returns on'yomi/kun'yomi/meanings for the requested characters */
export const useKanjiInfo = (kanjiChars: string[]) => {
    return useQuery({
        enabled: kanjiChars.length > 0,
        queryFn: async (): Promise<KanjiDictionary> => {
            const dictionary = await loadDictionary();
            const result: KanjiDictionary = {};

            for (const char of kanjiChars) {
                const info = dictionary[char];
                if (info) {
                    result[char] = info;
                }
            }

            return result;
        },
        queryKey: ['kanjidic2', kanjiChars],
        staleTime: Infinity,
    });
};
