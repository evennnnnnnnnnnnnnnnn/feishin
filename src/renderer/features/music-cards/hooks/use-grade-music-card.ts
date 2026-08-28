import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { musicCardReviewsQueryKey } from '/@/renderer/features/music-cards/hooks/use-music-card-reviews';
import { useCurrentServer } from '/@/renderer/store';
import { MusicCardReviewDto, MusicCardReviewGrade, ServerType } from '/@/shared/types/domain-types';

/**
 * Submit one again/hard/good/easy answer for a card. The SM-2 transition runs
 * server-side and the server's updated state comes back, so the schedule stays
 * consistent across devices; there is no local fallback - grading needs the
 * card's server row to exist.
 */
export const useGradeMusicCard = () => {
    const server = useCurrentServer();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: {
            cardId: string;
            grade: MusicCardReviewGrade;
        }): Promise<MusicCardReviewDto> => {
            const serverId = server?.id;

            if (!serverId || server?.type !== ServerType.NAVIDROME) {
                return Promise.reject(new Error('No Navidrome server to grade a music card on'));
            }

            const review = await api.controller.gradeMusicCardReview?.({
                apiClientProps: { serverId },
                body: { cardId: variables.cardId, grade: variables.grade },
            });

            if (!review) {
                return Promise.reject(new Error('Failed to grade music card'));
            }

            return review;
        },
        onSuccess: () => {
            if (!server?.id) return;

            queryClient.invalidateQueries({ queryKey: musicCardReviewsQueryKey(server.id) });
        },
    });
};
