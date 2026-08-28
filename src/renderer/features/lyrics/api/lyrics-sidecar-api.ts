import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';

/**
 * Saves raw .lrc text as a sidecar file next to the song's audio on the server.
 *
 * Only the song id and the text travel. The server derives the destination from
 * the media file's own record, validates the text by parsing it, and writes
 * atomically, so a bad paste never leaves a broken file in the library.
 *
 * On success the lyrics query is invalidated rather than written directly: the
 * sidecar has to be re-resolved through the server's own LyricsPriority chain,
 * which is the only thing that knows whether an override outranks it.
 */
export const useSaveLyricsSidecarMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            content,
            serverId,
            songId,
        }: {
            content: string;
            serverId: string;
            songId: string;
        }) =>
            api.controller.saveLyricsSidecar?.({
                apiClientProps: { serverId },
                body: { content },
                query: { songId },
            }),
        onSuccess: (_data, { serverId, songId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.songs.lyrics(serverId, { songId }),
            });
        },
    });
};
