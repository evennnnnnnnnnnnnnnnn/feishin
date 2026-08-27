import { describe, expect, it } from 'vitest';

import { analyzeLyricsLines } from './furigana';

// Reference cases and expected offsets mirror the Museeks Rust implementation
// (src-tauri/src/plugins/furigana.rs, test_analyze_lyrics).
describe('analyzeLyricsLines', () => {
    it('annotates kanji tokens and skips kana-only ones, advancing the offset', async () => {
        const [tokens] = await analyzeLyricsLines(['夜に駆ける']);

        expect(tokens).toHaveLength(2);

        expect(tokens[0]).toMatchObject({ reading: 'よる', start: 0, text: '夜' });

        const kakeru = tokens.find((token) => token.text === '駆ける');
        expect(kakeru).toMatchObject({ reading: 'かける', start: 2 });
        expect(kakeru?.segments[0]).toMatchObject({ reading: 'か', text: '駆' });
        expect(kakeru?.segments[1]).toMatchObject({ reading: null, text: 'ける' });
    });

    it('returns nothing to annotate for a kana-only line', async () => {
        const [tokens] = await analyzeLyricsLines(['きらきら']);
        expect(tokens).toEqual([]);
    });

    it('advances char offsets correctly across a Latin prefix', async () => {
        const [tokens] = await analyzeLyricsLines(['Lonely 世界を振り返る']);

        const sekai = tokens.find((token) => token.text === '世界');
        expect(sekai).toMatchObject({ reading: 'せかい', start: 7 });

        const furikaeru = tokens.find((token) => token.text === '振り返る');
        expect(furikaeru).toMatchObject({ reading: 'ふりかえる' });
        expect(furikaeru?.segments).toEqual([
            { reading: 'ふ', text: '振' },
            { reading: null, text: 'り' },
            { reading: 'かえ', text: '返' },
            { reading: null, text: 'る' },
        ]);
    });
});
