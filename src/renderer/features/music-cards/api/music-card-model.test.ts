import { describe, expect, it } from 'vitest';

import { MusicCard, MusicCardSnippet, reconcileMusicCards } from './music-card-model';

import { MusicCardWithSnippetsDto } from '/@/shared/types/domain-types';

const snippet = (overrides: Partial<MusicCardSnippet> = {}): MusicCardSnippet => ({
    cardId: 'card-1',
    charOffset: 0,
    endMs: 4000,
    fullLyrics: 'full lyrics',
    id: 'snippet-1',
    lineIndex: 2,
    mediaFileId: 'media-1',
    reading: 'よ',
    snippetText: 'a line',
    songArtist: 'artist',
    songRemoved: false,
    songTitle: 'title',
    spanLength: 1,
    startMs: 1000,
    ...overrides,
});

const card = (overrides: Partial<MusicCard> = {}): MusicCard => ({
    createdAt: '2026-08-01T00:00:00Z',
    id: 'card-1',
    kanjiText: '夜',
    serverId: 'server-1',
    snippets: [snippet()],
    songRemoved: false,
    ...overrides,
});

const serverCard = (
    overrides: Partial<MusicCardWithSnippetsDto> = {},
): MusicCardWithSnippetsDto => ({
    created_at: '2026-08-01T00:00:00Z',
    id: 'card-1',
    kanji_text: '夜',
    snippets: [
        {
            card_id: 'card-1',
            char_offset: 0,
            created_at: '2026-08-01T00:00:00Z',
            end_ms: 4000,
            full_lyrics: 'full lyrics',
            id: 'snippet-1',
            line_index: 2,
            media_file_id: 'media-1',
            reading: 'よ',
            snippet_text: 'a line',
            song_artist: 'artist',
            song_title: 'title',
            span_length: 1,
            start_ms: 1000,
            updated_at: '2026-08-01T00:00:00Z',
        },
    ],
    updated_at: '2026-08-01T00:00:00Z',
    user_id: 'user-1',
    ...overrides,
});

describe('reconcileMusicCards', () => {
    it('lets the server win while the song exists', () => {
        const local = [card({ snippets: [snippet({ reading: 'stale' })] })];
        const [reconciled] = reconcileMusicCards(local, [serverCard()], 'server-1');

        expect(reconciled.snippets).toHaveLength(1);
        expect(reconciled.snippets[0].reading).toBe('よ');
        expect(reconciled.songRemoved).toBe(false);
    });

    it('adopts a server card the local deck has never seen', () => {
        const reconciled = reconcileMusicCards([], [serverCard()], 'server-1');

        expect(reconciled).toHaveLength(1);
        expect(reconciled[0].serverId).toBe('server-1');
        expect(reconciled[0].songRemoved).toBe(false);
    });

    it('keeps and flags a snippet whose server row cascaded away with its song', () => {
        const local = [card({ snippets: [snippet(), snippet({ id: 'snippet-2' })] })];
        const [reconciled] = reconcileMusicCards(local, [serverCard()], 'server-1');

        expect(reconciled.snippets.map((entry) => entry.id)).toEqual(['snippet-1', 'snippet-2']);
        expect(reconciled.snippets[1].songRemoved).toBe(true);
        expect(reconciled.songRemoved).toBe(true);
    });

    it('keeps and flags a card the server no longer has at all', () => {
        const [reconciled] = reconcileMusicCards([card()], [], 'server-1');

        expect(reconciled.id).toBe('card-1');
        expect(reconciled.songRemoved).toBe(true);
        expect(reconciled.snippets[0].songRemoved).toBe(true);
    });

    it('leaves cards belonging to another server untouched', () => {
        const other = card({ id: 'card-2', serverId: 'server-2' });
        const reconciled = reconcileMusicCards([other], [], 'server-1');

        expect(reconciled).toEqual([other]);
    });
});
