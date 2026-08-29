import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';

import { api } from '/@/renderer/api';
import { MusicCard } from '/@/renderer/features/music-cards/api/music-card-model';
import { sweepSnippetClips } from '/@/renderer/features/music-cards/storage/music-card-clip-storage';
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
    const userId = server?.userId ?? null;
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

        reconcile(serverId, userId, serverCards);
    }, [reconcile, serverCards, serverId, userId]);

    // Two accounts on one machine share a server entry, so a card on the current
    // server has to belong to the current account. Cards held against any other
    // server are shown as before - that is what makes the deck standalone.
    const visibleCards = useMemo(
        () => cards.filter((card) => card.serverId !== serverId || card.userId === userId),
        [cards, serverId, userId],
    );

    // One orphan sweep per mount: drop stored clips no snippet in the hydrated
    // local deck references (cleared store, interrupted deletes). Runs against
    // the deck as it stood on mount, before any save this visit could race it.
    // Deliberately the whole deck, not visibleCards - sweeping the visible slice
    // would delete the other account's clips.
    const sweptRef = useRef(false);
    useEffect(() => {
        if (sweptRef.current) return;

        sweptRef.current = true;
        sweepSnippetClips(
            new Set(cards.flatMap((card) => card.snippets.map((snippet) => snippet.id))),
        );
    }, [cards]);

    return {
        cards: visibleCards,
        error: query.error,
        isError: query.isError,
        isFetching: query.isFetching,
        isLoading: enabled && query.isLoading,
    };
};
