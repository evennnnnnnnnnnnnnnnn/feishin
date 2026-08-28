import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { MusicCardSnippet } from '/@/renderer/features/music-cards/api/music-card-model';
import { musicCardsQueryKey } from '/@/renderer/features/music-cards/hooks/use-music-cards';
import { putSnippetClip } from '/@/renderer/features/music-cards/storage/music-card-clip-storage';
import { useCurrentServer } from '/@/renderer/store';
import { useMusicCardsStoreActions } from '/@/renderer/store/music-cards.store';
import { logger } from '/@/renderer/utils/logger';
import { ServerType } from '/@/shared/types/domain-types';

export type SaveMusicCardInput = {
    charOffset: number;
    endMs: number;
    fullLyrics: string;
    kanjiText: string;
    lineIndex: number;
    mediaFileId: string;
    reading: string;
    snippetText: string;
    songArtist: string;
    songTitle: string;
    spanLength: number;
    startMs: number;
};

export type SaveMusicCardResult = {
    cardId: string;
    clipStored: boolean;
    snippet: MusicCardSnippet;
};

/**
 * Save a kanji run to the deck.
 *
 * Upserts the card by (user, kanji run) - saving a kanji that already has a
 * card appends another snippet to it rather than creating a second card -
 * creates the snippet, then downloads its audio clip and persists the text to
 * the local store and the blob to IndexedDB so the card can stand alone.
 *
 * A failed clip download does not fail the save: the card is still worth
 * having, and replay falls back to stream playback until a clip exists.
 */
export const useSaveMusicCard = () => {
    const server = useCurrentServer();
    const queryClient = useQueryClient();
    const { saveSnippet } = useMusicCardsStoreActions();

    return useMutation({
        mutationFn: async (input: SaveMusicCardInput): Promise<SaveMusicCardResult> => {
            const serverId = server?.id;

            if (!serverId || server?.type !== ServerType.NAVIDROME) {
                return Promise.reject(new Error('No Navidrome server to save a music card to'));
            }

            const card = await api.controller.upsertMusicCard?.({
                apiClientProps: { serverId },
                body: { kanjiText: input.kanjiText },
            });

            if (!card) {
                return Promise.reject(new Error('Failed to save music card'));
            }

            const created = await api.controller.createMusicCardSnippet?.({
                apiClientProps: { serverId },
                body: {
                    card_id: card.id,
                    char_offset: input.charOffset,
                    end_ms: input.endMs,
                    full_lyrics: input.fullLyrics,
                    line_index: input.lineIndex,
                    media_file_id: input.mediaFileId,
                    reading: input.reading,
                    snippet_text: input.snippetText,
                    song_artist: input.songArtist,
                    song_title: input.songTitle,
                    span_length: input.spanLength,
                    start_ms: input.startMs,
                },
            });

            if (!created) {
                return Promise.reject(new Error('Failed to save music card snippet'));
            }

            const snippet: MusicCardSnippet = {
                cardId: card.id,
                charOffset: input.charOffset,
                endMs: input.endMs,
                fullLyrics: input.fullLyrics,
                id: created.id,
                lineIndex: input.lineIndex,
                mediaFileId: input.mediaFileId,
                reading: input.reading,
                snippetText: input.snippetText,
                songArtist: input.songArtist,
                songRemoved: false,
                songTitle: input.songTitle,
                spanLength: input.spanLength,
                startMs: input.startMs,
            };

            let clipStored = false;

            try {
                const clip = await api.controller.getMusicCardClip?.({
                    apiClientProps: { serverId },
                    query: {
                        endMs: input.endMs,
                        mediaFileId: input.mediaFileId,
                        startMs: input.startMs,
                    },
                });

                if (clip) {
                    await putSnippetClip(created.id, clip);
                    clipStored = true;
                }
            } catch (error) {
                logger.warn('Failed to store music card clip', {
                    error: String(error),
                    snippetId: created.id,
                });
            }

            saveSnippet({
                cardId: card.id,
                createdAt: new Date().toISOString(),
                kanjiText: input.kanjiText,
                serverId,
                snippet,
            });

            return { cardId: card.id, clipStored, snippet };
        },
        onSuccess: () => {
            if (!server?.id) return;

            queryClient.invalidateQueries({ queryKey: musicCardsQueryKey(server.id) });
        },
    });
};
