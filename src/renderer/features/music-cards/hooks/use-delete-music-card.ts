import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { musicCardSnippetIds } from '/@/renderer/features/music-cards/api/music-card-model';
import { musicCardsQueryKey } from '/@/renderer/features/music-cards/hooks/use-music-cards';
import { deleteSnippetClips } from '/@/renderer/features/music-cards/storage/music-card-clip-storage';
import { useCurrentServer } from '/@/renderer/store';
import { useMusicCardsStore, useMusicCardsStoreActions } from '/@/renderer/store/music-cards.store';
import { logger } from '/@/renderer/utils/logger';
import { ServerType } from '/@/shared/types/domain-types';

/**
 * Remove a card from the server (when it still has one), the local store, and
 * IndexedDB.
 *
 * The server delete is best-effort: a card flagged `songRemoved`, or one saved
 * against a server that is gone, has nothing left to delete there, and that
 * must not block the operator from clearing it locally.
 */
export const useDeleteMusicCard = () => {
    const server = useCurrentServer();
    const queryClient = useQueryClient();
    const { removeCard } = useMusicCardsStoreActions();

    return useMutation({
        mutationFn: async (variables: { cardId: string }): Promise<void> => {
            const card = useMusicCardsStore
                .getState()
                .cards.find((entry) => entry.id === variables.cardId);

            const serverId = server?.id;

            if (serverId && server?.type === ServerType.NAVIDROME && !card?.songRemoved) {
                try {
                    await api.controller.deleteMusicCard?.({
                        apiClientProps: { serverId },
                        query: { id: variables.cardId },
                    });
                } catch (error) {
                    logger.warn('Failed to delete music card on the server', {
                        cardId: variables.cardId,
                        error: String(error),
                    });
                }
            }

            await deleteSnippetClips(musicCardSnippetIds(card));

            removeCard(variables.cardId);
        },
        onSuccess: () => {
            if (!server?.id) return;

            queryClient.invalidateQueries({ queryKey: musicCardsQueryKey(server.id) });
        },
    });
};

/**
 * Remove a single saved context from a card - server row, local record, and
 * stored clip. Same best-effort server delete as {@link useDeleteMusicCard}:
 * a snippet flagged `songRemoved` has no server row left to delete.
 *
 * The card itself is kept even when its last snippet goes; clearing the card
 * is {@link useDeleteMusicCard}'s job.
 */
export const useDeleteMusicCardSnippet = () => {
    const server = useCurrentServer();
    const queryClient = useQueryClient();
    const { removeSnippet } = useMusicCardsStoreActions();

    return useMutation({
        mutationFn: async (variables: { cardId: string; snippetId: string }): Promise<void> => {
            const snippet = useMusicCardsStore
                .getState()
                .cards.find((entry) => entry.id === variables.cardId)
                ?.snippets.find((entry) => entry.id === variables.snippetId);

            const serverId = server?.id;

            if (serverId && server?.type === ServerType.NAVIDROME && !snippet?.songRemoved) {
                try {
                    await api.controller.deleteMusicCardSnippet?.({
                        apiClientProps: { serverId },
                        query: { id: variables.snippetId },
                    });
                } catch (error) {
                    logger.warn('Failed to delete music card snippet on the server', {
                        error: String(error),
                        snippetId: variables.snippetId,
                    });
                }
            }

            await deleteSnippetClips([variables.snippetId]);

            removeSnippet(variables.cardId, variables.snippetId);
        },
        onSuccess: () => {
            if (!server?.id) return;

            queryClient.invalidateQueries({ queryKey: musicCardsQueryKey(server.id) });
        },
    });
};
