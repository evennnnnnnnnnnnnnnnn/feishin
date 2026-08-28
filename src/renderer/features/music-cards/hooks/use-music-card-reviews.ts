import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { api } from '/@/renderer/api';
import { useCurrentServer } from '/@/renderer/store';
import { MusicCardReviewDto, ServerType } from '/@/shared/types/domain-types';

export const musicCardReviewsQueryKey = (serverId: string) =>
    ['musicCardReviews', serverId] as const;

/**
 * All of the current user's review state rows, keyed by card id.
 *
 * The full set is fetched rather than just the due slice: the queue needs to
 * tell "due later" apart from "new" (no row at all), and the whole table is at
 * most one small row per card. Review state is server-only - scheduling lives
 * with the server so every device sees the same queue - so this is disabled
 * (and the deck's review affordance degrades) without a Navidrome server.
 *
 * `fetchedAt` is the clock reading taken with the data; due-ness is judged
 * against it (not against render time) so the computation stays pure and only
 * moves when the data refreshes.
 */
export const useMusicCardReviews = (): {
    fetchedAt: null | number;
    isError: boolean;
    isLoading: boolean;
    reviewsByCardId: Map<string, MusicCardReviewDto>;
} => {
    const server = useCurrentServer();
    const serverId = server?.id;
    const enabled = !!serverId && server?.type === ServerType.NAVIDROME;

    const query = useQuery({
        enabled,
        queryFn: async () => ({
            fetchedAt: Date.now(),
            reviews:
                (await api.controller.getMusicCardReviews?.({
                    apiClientProps: { serverId: serverId as string },
                    query: {},
                })) ?? [],
        }),
        queryKey: musicCardReviewsQueryKey(serverId ?? ''),
        staleTime: 0,
    });

    const reviews = query.data?.reviews;
    const reviewsByCardId = useMemo(
        () => new Map((reviews ?? []).map((review) => [review.card_id, review])),
        [reviews],
    );

    return {
        fetchedAt: query.data?.fetchedAt ?? null,
        isError: query.isError,
        isLoading: enabled && query.isLoading,
        reviewsByCardId,
    };
};
