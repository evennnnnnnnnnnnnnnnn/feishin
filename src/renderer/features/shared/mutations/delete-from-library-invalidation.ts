import type { MutationOptions } from '/@/renderer/lib/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { queryKeys } from '/@/renderer/api/query-keys';
import { infiniteLoaderDataQueryKey } from '/@/renderer/components/item-list/helpers/item-list-infinite-loader';
import {
    DeleteFromLibraryArgs,
    DeleteFromLibraryResponse,
    LibraryItem,
} from '/@/shared/types/domain-types';

/**
 * Caches a library deletion can leave stale. Deleting either kind can empty an album and
 * change artist counts, and a deleted song can still be sitting in a playlist, so the whole
 * set goes rather than only the list that was on screen.
 */
export const deleteFromLibraryQueryKeys = (serverId: string): QueryKey[] => [
    queryKeys.albums.root(serverId),
    queryKeys.songs.root(serverId),
    queryKeys.albumArtists.root(serverId),
    queryKeys.artists.root(serverId),
    queryKeys.playlists.root(serverId),
    infiniteLoaderDataQueryKey(serverId, LibraryItem.ALBUM),
    infiniteLoaderDataQueryKey(serverId, LibraryItem.SONG),
    infiniteLoaderDataQueryKey(serverId, LibraryItem.ALBUM_ARTIST),
];

export const invalidateDeleteFromLibrary = (queryClient: QueryClient, serverId: string) => {
    for (const queryKey of deleteFromLibraryQueryKeys(serverId)) {
        queryClient.invalidateQueries({ exact: false, queryKey });
    }
};

/**
 * Built here rather than inline in the hook so the invalidation wiring can be exercised
 * without rendering React.
 *
 * The invalidation hangs off `onSettled`, not `onSuccess`: a batch delete can move some
 * files to trash and drop their rows before it stops on a later one, and the server answers
 * that partial run with a 500. Those rows really are gone, so the caches are stale whether
 * the call resolved or rejected - on `onSuccess` alone the UI would keep listing tracks
 * that 404 on play. Invalidation is idempotent and cheap, so running it on both paths costs
 * nothing.
 */
export const buildDeleteFromLibraryMutationOptions = (
    queryClient: QueryClient,
    mutationFn: (args: DeleteFromLibraryArgs) => Promise<DeleteFromLibraryResponse>,
    options?: MutationOptions,
) => ({
    mutationFn,
    ...options,
    onSettled: (
        data: unknown,
        error: unknown,
        variables: DeleteFromLibraryArgs,
        context: unknown,
    ) => {
        invalidateDeleteFromLibrary(queryClient, variables.apiClientProps.serverId);
        options?.onSettled?.(data, error, variables, context);
    },
});
