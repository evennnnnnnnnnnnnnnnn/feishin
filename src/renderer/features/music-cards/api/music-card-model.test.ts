import { describe, expect, it } from 'vitest';

import {
    cardsForMediaFile,
    MusicCard,
    MusicCardSnippet,
    reconcileMusicCards,
} from './music-card-model';

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
    userId: 'user-1',
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
        const [reconciled] = reconcileMusicCards(local, [serverCard()], 'server-1', 'user-1');

        expect(reconciled.snippets).toHaveLength(1);
        expect(reconciled.snippets[0].reading).toBe('よ');
        expect(reconciled.songRemoved).toBe(false);
    });

    it('adopts a server card the local deck has never seen', () => {
        const reconciled = reconcileMusicCards([], [serverCard()], 'server-1', 'user-1');

        expect(reconciled).toHaveLength(1);
        expect(reconciled[0].serverId).toBe('server-1');
        expect(reconciled[0].userId).toBe('user-1');
        expect(reconciled[0].songRemoved).toBe(false);
    });

    it('keeps and flags a snippet whose server row cascaded away with its song', () => {
        const local = [card({ snippets: [snippet(), snippet({ id: 'snippet-2' })] })];
        const [reconciled] = reconcileMusicCards(local, [serverCard()], 'server-1', 'user-1');

        expect(reconciled.snippets.map((entry) => entry.id)).toEqual(['snippet-1', 'snippet-2']);
        expect(reconciled.snippets[1].songRemoved).toBe(true);
        expect(reconciled.songRemoved).toBe(true);
    });

    it('keeps and flags a card the server no longer has at all', () => {
        const [reconciled] = reconcileMusicCards([card()], [], 'server-1', 'user-1');

        expect(reconciled.id).toBe('card-1');
        expect(reconciled.songRemoved).toBe(true);
        expect(reconciled.snippets[0].songRemoved).toBe(true);
    });

    it('leaves cards belonging to another server untouched', () => {
        const other = card({ id: 'card-2', serverId: 'server-2' });
        const reconciled = reconcileMusicCards([other], [], 'server-1', 'user-1');

        expect(reconciled).toEqual([other]);
    });

    // Removing and re-adding the same Navidrome mints a new Feishin serverId
    // while the server-minted card ids stay put, so the stale rows used to be
    // carried forward as "other server" cards: a duplicate deck and duplicate
    // React keys, one extra copy per re-add.
    it('drops a stale-serverId copy of a card the current server still has', () => {
        const stale = card({ serverId: 'old-server' });
        const reconciled = reconcileMusicCards([stale], [serverCard()], 'server-1', 'user-1');

        expect(reconciled).toHaveLength(1);
        expect(reconciled[0].serverId).toBe('server-1');
        expect(reconciled[0].userId).toBe('user-1');
    });

    it('drops stale copies left by several different serverIds', () => {
        const local = [
            card({ serverId: 'old-server-1' }),
            card({ serverId: 'old-server-2' }),
            card({ serverId: 'old-server-3' }),
        ];
        const reconciled = reconcileMusicCards(local, [serverCard()], 'server-1', 'user-1');

        expect(reconciled).toHaveLength(1);
        expect(reconciled[0].serverId).toBe('server-1');
        expect(reconciled[0].userId).toBe('user-1');
    });

    it('collapses stale duplicates even when the server no longer has the card', () => {
        // Nothing to reconcile against, so the orphan path wins - but the deck
        // must still end up with one card, not three.
        const local = [
            card({ serverId: 'server-1' }),
            card({ serverId: 'old-server-1' }),
            card({ serverId: 'old-server-2' }),
        ];
        const reconciled = reconcileMusicCards(local, [], 'server-1', 'user-1');

        expect(reconciled).toHaveLength(1);
        expect(reconciled[0].songRemoved).toBe(true);
    });

    it('keeps a genuinely different card from another server', () => {
        const other = card({ id: 'card-2', kanjiText: '空', serverId: 'server-2' });
        const reconciled = reconcileMusicCards([other], [serverCard()], 'server-1', 'user-1');

        expect(reconciled).toHaveLength(2);
        expect(reconciled.map((entry) => entry.id).sort()).toEqual(['card-1', 'card-2']);
    });

    it('never emits the same card id twice', () => {
        const local = [
            card({ serverId: 'old-server' }),
            card({ id: 'card-2', kanjiText: '空', serverId: 'old-server' }),
        ];
        const reconciled = reconcileMusicCards(
            local,
            [serverCard(), serverCard({ id: 'card-2', kanji_text: '空' })],
            'server-1',
            'user-1',
        );

        const ids = reconciled.map((entry) => entry.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
    it("leaves another account's cards on this server untouched", () => {
        const theirs = card({ id: 'their-card', userId: 'user-2' });
        const reconciled = reconcileMusicCards([theirs], [serverCard()], 'server-1', 'user-1');

        const kept = reconciled.find((entry) => entry.id === 'their-card');
        expect(kept).toEqual(theirs);
        expect(kept?.songRemoved).toBe(false);
    });

    it("does not orphan another account's card when this account's deck is empty", () => {
        const theirs = card({ id: 'their-card', userId: 'user-2' });
        const reconciled = reconcileMusicCards([theirs], [], 'server-1', 'user-1');

        expect(reconciled).toEqual([theirs]);
    });

    it('claims a legacy card the server confirms for this account', () => {
        const legacy = card({ userId: null });
        const [reconciled] = reconcileMusicCards([legacy], [serverCard()], 'server-1', 'user-1');

        expect(reconciled.userId).toBe('user-1');
    });

    it('leaves a legacy card the server does not confirm unclaimed', () => {
        const legacy = card({ id: 'gone', userId: null });
        const reconciled = reconcileMusicCards([legacy], [], 'server-1', 'user-1');

        expect(reconciled[0].userId).toBeNull();
        expect(reconciled[0].songRemoved).toBe(true);
    });
});

describe('cardsForMediaFile', () => {
    it('keeps a card whose snippet was saved from the song', () => {
        const match = card({ id: 'card-1', snippets: [snippet({ mediaFileId: 'media-1' })] });
        const other = card({ id: 'card-2', snippets: [snippet({ mediaFileId: 'media-2' })] });

        expect(cardsForMediaFile([match, other], 'media-1')).toEqual([match]);
    });

    // A card spans songs: the same kanji saved from two tracks is one card.
    // Membership is decided over the snippets, so such a card belongs to both.
    it('keeps a card that holds the song among several others', () => {
        const spanning = card({
            snippets: [
                snippet({ id: 'snippet-1', mediaFileId: 'media-2' }),
                snippet({ id: 'snippet-2', mediaFileId: 'media-1' }),
            ],
        });

        expect(cardsForMediaFile([spanning], 'media-1')).toEqual([spanning]);
        expect(cardsForMediaFile([spanning], 'media-2')).toEqual([spanning]);
    });

    it('drops a card with no snippet from the song, and never matches on card id', () => {
        const other = card({ id: 'media-1', snippets: [snippet({ mediaFileId: 'media-2' })] });

        expect(cardsForMediaFile([other], 'media-1')).toEqual([]);
    });

    it('returns nothing for a card carrying no snippets at all', () => {
        expect(cardsForMediaFile([card({ snippets: [] })], 'media-1')).toEqual([]);
    });

    it('preserves the incoming order of the cards it keeps', () => {
        const first = card({ id: 'card-1' });
        const skipped = card({ id: 'card-2', snippets: [snippet({ mediaFileId: 'other' })] });
        const last = card({ id: 'card-3' });

        expect(cardsForMediaFile([first, skipped, last], 'media-1')).toEqual([first, last]);
    });

    it('does not mutate or copy the cards it is given', () => {
        const only = card();
        const input = [only];
        const result = cardsForMediaFile(input, 'media-1');

        expect(result).not.toBe(input);
        expect(result[0]).toBe(only);
    });
});
