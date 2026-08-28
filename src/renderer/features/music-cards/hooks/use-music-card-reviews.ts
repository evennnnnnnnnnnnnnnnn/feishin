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
        queryFn: async () => {
            const reviews =
                (await api.controller.getMusicCardReviews?.({
                    apiClientProps: { serverId: serverId as string },
                    query: {},
                })) ?? [];

            // Clock reading taken after the response so slow requests are not
            // already stale on arrival.
            return { fetchedAt: Date.now(), reviews };
        },
        queryKey: musicCardReviewsQueryKey(serverId ?? ''),
        // Refetch when the nearest future due_at arrives (bounded to stay
        // responsive to schedule changes without hammering the server), so a
        // card that becomes due while the route stays open enters the queue
        // without needing a focus event or mutation.
        refetchInterval: (activeQuery) => {
            const data = activeQuery.state.data;

            if (!data) return false;

            const dueTimes = data.reviews
                .map((review) => new Date(review.due_at).getTime())
                .filter((dueTime) => dueTime > data.fetchedAt);

            if (dueTimes.length === 0) return false;

            const wait = Math.min(...dueTimes) - data.fetchedAt;

            return Math.min(Math.max(wait, 30_000), 15 * 60_000);
        },
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
