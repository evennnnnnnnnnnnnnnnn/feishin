import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { api } from '/@/renderer/api';
import { buildDeleteFromLibraryMutationOptions } from '/@/renderer/features/shared/mutations/delete-from-library-invalidation';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import {
    DeleteFromLibraryArgs,
    DeleteFromLibraryResponse,
    LibraryItem,
} from '/@/shared/types/domain-types';

/**
 * Admin-only removal of media from the server library.
 *
 * Navidrome-only: the endpoints are optional on the controller, hence the non-null
 * assertions. Call sites gate on server type and admin, see `useIsNavidromeAdmin`.
 *
 * See `buildDeleteFromLibraryMutationOptions` for what gets invalidated, and why it runs on
 * settle rather than success.
 */
const useDeleteFromLibrary = (
    itemType: LibraryItem.ALBUM | LibraryItem.SONG,
    args: MutationHookArgs,
) => {
    const { options } = args || {};
    const queryClient = useQueryClient();

    return useMutation<DeleteFromLibraryResponse, AxiosError, DeleteFromLibraryArgs>(
        buildDeleteFromLibraryMutationOptions(
            queryClient,
            (args) => {
                const endpoint =
                    itemType === LibraryItem.ALBUM
                        ? api.controller.deleteAlbumsFromLibrary!
                        : api.controller.deleteSongsFromLibrary!;

                return endpoint({
                    ...args,
                    apiClientProps: { serverId: args.apiClientProps.serverId },
                });
            },
            options,
        ),
    );
};

export const useDeleteAlbumsFromLibrary = (args: MutationHookArgs) =>
    useDeleteFromLibrary(LibraryItem.ALBUM, args);

export const useDeleteSongsFromLibrary = (args: MutationHookArgs) =>
    useDeleteFromLibrary(LibraryItem.SONG, args);
