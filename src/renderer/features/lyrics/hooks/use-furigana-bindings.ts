import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import {
    FuriganaBinding,
    removeBindingFromList,
    upsertBindingInList,
} from '/@/renderer/features/lyrics/api/furigana-render-model';
import { ServerType } from '/@/shared/types/domain-types';

const bindingsQueryKey = (serverId: string, mediaFileId: string) =>
    ['furiganaBindings', serverId, mediaFileId] as const;

/** Per-user furigana bindings for a song. No-op (disabled) on non-Navidrome servers - the native REST endpoint is Navidrome-only. */
export const useFuriganaBindings = (
    serverId: string | undefined,
    serverType: ServerType | undefined,
    mediaFileId: string | undefined,
) => {
    return useQuery({
        enabled: !!serverId && !!mediaFileId && serverType === ServerType.NAVIDROME,
        queryFn: () =>
            api.controller.getFuriganaBindings?.({
                apiClientProps: { serverId: serverId as string },
                query: { mediaFileId: mediaFileId as string },
            }) ?? Promise.resolve([]),
        queryKey: bindingsQueryKey(serverId ?? '', mediaFileId ?? ''),
        staleTime: 0,
    });
};

export type FuriganaBindingUpsertInput = {
    charOffset: number;
    display: boolean;
    kanjiText: string;
    lineIndex: number;
    reading: string;
    spanLength: number;
};

/** Upserts by (line_index, char_offset) - the server routes POST through the same natural-key upsert as PUT */
export const useUpsertFuriganaBindingMutation = (
    serverId: string | undefined,
    mediaFileId: string | undefined,
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: FuriganaBindingUpsertInput) => {
            if (!serverId || !mediaFileId) {
                return Promise.reject(new Error('No server or song to bind furigana to'));
            }

            return api.controller.upsertFuriganaBinding?.({
                apiClientProps: { serverId },
                body: {
                    charOffset: input.charOffset,
                    display: input.display,
                    kanjiText: input.kanjiText,
                    lineIndex: input.lineIndex,
                    mediaFileId,
                    reading: input.reading,
                    spanLength: input.spanLength,
                },
            });
        },
        onSuccess: (saved) => {
            if (!serverId || !mediaFileId || !saved) return;

            queryClient.setQueryData<FuriganaBinding[]>(
                bindingsQueryKey(serverId, mediaFileId),
                (prev) => upsertBindingInList(prev ?? [], saved),
            );
        },
    });
};

export const useDeleteFuriganaBindingMutation = (
    serverId: string | undefined,
    mediaFileId: string | undefined,
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: { charOffset: number; id: string; lineIndex: number }) => {
            if (!serverId) {
                return Promise.reject(new Error('No server to delete a furigana binding from'));
            }

            return api.controller.deleteFuriganaBinding?.({
                apiClientProps: { serverId },
                query: { id: variables.id },
            });
        },
        onSuccess: (_data, variables) => {
            if (!serverId || !mediaFileId) return;

            queryClient.setQueryData<FuriganaBinding[]>(
                bindingsQueryKey(serverId, mediaFileId),
                (prev) =>
                    removeBindingFromList(prev ?? [], variables.lineIndex, variables.charOffset),
            );
        },
    });
};
