import type { MusicCardWithSnippetsDto } from '/@/shared/types/domain-types';

/** A revision card: one kanji run, N saved contexts. */
export type MusicCard = {
    createdAt: string;
    id: string;
    kanjiText: string;
    /** Which server this card was saved against - the local deck can outlive a server entry */
    serverId: string;
    snippets: MusicCardSnippet[];
    /** True when the card itself, or any of its snippets, no longer exists server-side */
    songRemoved: boolean;
};

/**
 * A saved lyric context on a card. Everything needed to render and replay it
 * is snapshotted at save time, so the snippet stays usable after its song
 * leaves the library.
 */
export type MusicCardSnippet = {
    cardId: string;
    charOffset: number;
    endMs: number;
    fullLyrics: string;
    id: string;
    lineIndex: number;
    mediaFileId: string;
    reading: string;
    snippetText: string;
    songArtist: string;
    /**
     * The server row is gone. `music_card_snippet.media_file_id` cascades, so
     * this is what deleting a song actually looks like: the card survives and
     * loses snippets. The local copy is kept and plays from its stored blob.
     */
    songRemoved: boolean;
    songTitle: string;
    spanLength: number;
    startMs: number;
};

const snippetFromDto = (
    dto: MusicCardWithSnippetsDto['snippets'][number],
): Omit<MusicCardSnippet, 'songRemoved'> => ({
    cardId: dto.card_id,
    charOffset: dto.char_offset,
    endMs: dto.end_ms,
    fullLyrics: dto.full_lyrics,
    id: dto.id,
    lineIndex: dto.line_index,
    mediaFileId: dto.media_file_id,
    reading: dto.reading,
    snippetText: dto.snippet_text,
    songArtist: dto.song_artist,
    songTitle: dto.song_title,
    spanLength: dto.span_length,
    startMs: dto.start_ms,
});

const markSnippetsRemoved = (snippets: MusicCardSnippet[]): MusicCardSnippet[] =>
    snippets.map((snippet) => (snippet.songRemoved ? snippet : { ...snippet, songRemoved: true }));

export const sortMusicCards = (cards: MusicCard[]): MusicCard[] =>
    [...cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/**
 * Merge the server's cards for one server into the locally held deck.
 *
 * While a song exists the server is the source of truth, so server rows
 * overwrite their local copies. Local rows the server no longer has are kept
 * and flagged `songRemoved` rather than deleted - that flag is what makes the
 * deck standalone. Cards belonging to other servers are passed through
 * untouched.
 */
export const reconcileMusicCards = (
    localCards: MusicCard[],
    serverCards: MusicCardWithSnippetsDto[],
    serverId: string,
): MusicCard[] => {
    const otherServerCards = localCards.filter((card) => card.serverId !== serverId);
    const localById = new Map(
        localCards.filter((card) => card.serverId === serverId).map((card) => [card.id, card]),
    );

    const reconciled: MusicCard[] = serverCards.map((dto) => {
        const local = localById.get(dto.id);
        localById.delete(dto.id);

        const serverSnippetIds = new Set(dto.snippets.map((snippet) => snippet.id));
        const serverSnippets: MusicCardSnippet[] = dto.snippets.map((snippet) => ({
            ...snippetFromDto(snippet),
            songRemoved: false,
        }));
        const orphanedSnippets = markSnippetsRemoved(
            (local?.snippets ?? []).filter((snippet) => !serverSnippetIds.has(snippet.id)),
        );

        const snippets = [...serverSnippets, ...orphanedSnippets];

        return {
            createdAt: dto.created_at,
            id: dto.id,
            kanjiText: dto.kanji_text,
            serverId,
            snippets,
            songRemoved: snippets.some((snippet) => snippet.songRemoved),
        };
    });

    // Whatever is left in localById has no server row at all any more
    const orphanedCards = [...localById.values()].map((card) => ({
        ...card,
        snippets: markSnippetsRemoved(card.snippets),
        songRemoved: true,
    }));

    return sortMusicCards([...otherServerCards, ...reconciled, ...orphanedCards]);
};

/** Every snippet id on a card - used to clean up its stored clips on delete */
export const musicCardSnippetIds = (card: MusicCard | undefined): string[] =>
    card?.snippets.map((snippet) => snippet.id) ?? [];
