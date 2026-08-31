import { MutationObserver, QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
    buildDeleteFromLibraryMutationOptions,
    deleteFromLibraryQueryKeys,
} from './delete-from-library-invalidation';

import { DeleteFromLibraryArgs, DeleteFromLibraryResponse } from '/@/shared/types/domain-types';

const SERVER_ID = 'server-1';

const variables: DeleteFromLibraryArgs = {
    apiClientProps: { serverId: SERVER_ID },
    query: { ids: ['song-1', 'song-2'] },
};

/**
 * Drives the real options object through react-query's own mutation machinery, so the test
 * covers where the invalidation is wired rather than a copy of it.
 */
const runDelete = async (mutationFn: () => Promise<DeleteFromLibraryResponse>) => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    const observer = new MutationObserver(
        queryClient,
        buildDeleteFromLibraryMutationOptions(queryClient, mutationFn),
    );

    const settled = await observer.mutate(variables).then(
        () => 'resolved' as const,
        () => 'rejected' as const,
    );

    return {
        invalidatedKeys: invalidateQueries.mock.calls.map(([filters]) => filters?.queryKey),
        settled,
    };
};

const succeeds = () =>
    Promise.resolve({ count: 2, ids: ['song-1', 'song-2'], trashFolder: '.trash' });

// What the server answers for a partial batch: it moved some files to trash and dropped
// their rows before stopping, then reported the whole run as a 500.
const failsPartway = () => Promise.reject(new Error('deleted 2 of 5 files, then stopped'));

describe('buildDeleteFromLibraryMutationOptions', () => {
    it('invalidates when the delete resolves', async () => {
        const { invalidatedKeys, settled } = await runDelete(succeeds);

        expect(settled).toBe('resolved');
        expect(invalidatedKeys).toEqual(deleteFromLibraryQueryKeys(SERVER_ID));
    });

    it('invalidates when the delete rejects, because a partial run really did remove rows', async () => {
        const { invalidatedKeys, settled } = await runDelete(failsPartway);

        expect(settled).toBe('rejected');
        expect(invalidatedKeys).toEqual(deleteFromLibraryQueryKeys(SERVER_ID));
    });

    it('still runs a caller-supplied onSettled on both paths', async () => {
        const onSettled = vi.fn();
        const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

        for (const mutationFn of [succeeds, failsPartway]) {
            const observer = new MutationObserver(
                queryClient,
                buildDeleteFromLibraryMutationOptions(queryClient, mutationFn, {
                    mutationKey: undefined,
                    onSettled,
                }),
            );
            await observer.mutate(variables).catch(() => undefined);
        }

        expect(onSettled).toHaveBeenCalledTimes(2);
    });
});
