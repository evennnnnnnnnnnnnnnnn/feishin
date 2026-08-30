import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { infiniteLoaderDataQueryKey } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import {
    DeleteFromLibraryArgs,
    DeleteFromLibraryResponse,
    LibraryItem,
} from '/@/shared/types/domain-types';

/**
 * Admin-only removal of media from the server library. Deleting either kind can empty an
 * album and change artist counts, so both variants invalidate albums and songs.
 *
 * Navidrome-only: the endpoints are optional on the controller, hence the non-null
 * assertions. Call sites gate on server type and admin, see `useCanDeleteFromLibrary`.
 */
const useDeleteFromLibrary = (
    itemType: LibraryItem.ALBUM | LibraryItem.SONG,
    args: MutationHookArgs,
) => {
    const { options } = args || {};
    const queryClient = useQueryClient();

    return useMutation<DeleteFromLibraryResponse, AxiosError, DeleteFromLibraryArgs>({
        mutationFn: (args) => {
            const endpoint =
                itemType === LibraryItem.ALBUM
                    ? api.controller.deleteAlbumsFromLibrary!
                    : api.controller.deleteSongsFromLibrary!;

            return endpoint({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        ...options,
        onSuccess: (data, variables, context) => {
            const { serverId } = variables.apiClientProps;

            // Artist pages carry their own album grids and counts, and a deleted song can
            // still be sitting in a playlist, so those caches go stale too.
            for (const key of [
                queryKeys.albums.root(serverId),
                queryKeys.songs.root(serverId),
                queryKeys.albumArtists.root(serverId),
                queryKeys.artists.root(serverId),
                queryKeys.playlists.root(serverId),
                infiniteLoaderDataQueryKey(serverId, LibraryItem.ALBUM),
                infiniteLoaderDataQueryKey(serverId, LibraryItem.SONG),
                infiniteLoaderDataQueryKey(serverId, LibraryItem.ALBUM_ARTIST),
            ]) {
                queryClient.invalidateQueries({ exact: false, queryKey: key });
            }

            options?.onSuccess?.(data, variables, context);
        },
    });
};

export const useDeleteAlbumsFromLibrary = (args: MutationHookArgs) =>
    useDeleteFromLibrary(LibraryItem.ALBUM, args);

export const useDeleteSongsFromLibrary = (args: MutationHookArgs) =>
    useDeleteFromLibrary(LibraryItem.SONG, args);
