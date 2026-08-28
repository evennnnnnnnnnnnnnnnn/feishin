import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { api } from '/@/renderer/api';
import { MusicCard } from '/@/renderer/features/music-cards/api/music-card-model';
import { useCurrentServer } from '/@/renderer/store';
import { useLocalMusicCards, useMusicCardsStoreActions } from '/@/renderer/store/music-cards.store';
import { ServerType } from '/@/shared/types/domain-types';

export const musicCardsQueryKey = (serverId: string) => ['musicCards', serverId] as const;

/**
 * The deck: locally held cards, reconciled against the server on load.
 *
 * The server is the source of truth while a song exists, so its rows overwrite
 * their local copies; cards and snippets the server no longer has are kept and
 * flagged `songRemoved` so they stay readable and playable from the local blob.
 * The returned list is the whole local deck, including cards saved against a
 * server that is no longer configured - that is the point of it being
 * standalone.
 *
 * No-op (disabled) on non-Navidrome servers: the native REST endpoints are
 * Navidrome-only, and the local deck is still returned.
 */
export const useMusicCards = (): {
    cards: MusicCard[];
    error: unknown;
    isError: boolean;
    isFetching: boolean;
    isLoading: boolean;
} => {
    const server = useCurrentServer();
    const cards = useLocalMusicCards();
    const { reconcile } = useMusicCardsStoreActions();

    const serverId = server?.id;
    const enabled = !!serverId && server?.type === ServerType.NAVIDROME;

    const query = useQuery({
        enabled,
        queryFn: () =>
            api.controller.getMusicCards?.({
                apiClientProps: { serverId: serverId as string },
                query: {},
            }) ?? Promise.resolve([]),
        queryKey: musicCardsQueryKey(serverId ?? ''),
        staleTime: 0,
    });

    const serverCards = query.data;

    useEffect(() => {
        if (!serverId || !serverCards) return;

        reconcile(serverId, serverCards);
    }, [reconcile, serverCards, serverId]);

    return {
        cards,
        error: query.error,
        isError: query.isError,
        isFetching: query.isFetching,
        isLoading: enabled && query.isLoading,
    };
};
