import {
    PersistedClient,
    Persister,
    PersistQueryClientProvider,
} from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import { createRoot } from 'react-dom/client';

import { App } from '/@/renderer/app';
import { type LyricsQueryResult } from '/@/renderer/features/lyrics/api/lyrics-api';
import { shouldPersistLyricsResult } from '/@/renderer/features/lyrics/api/lyrics-cache';
import { queryClient } from '/@/renderer/lib/react-query';

function createIDBPersister(idbValidKey: IDBValidKey = 'reactQuery') {
    return {
        persistClient: async (client: PersistedClient) => {
            set(idbValidKey, client);
        },
        removeClient: async () => {
            await del(idbValidKey);
        },
        restoreClient: async () => {
            return await get<PersistedClient>(idbValidKey);
        },
    } as Persister;
}

const indexedDbPersister = createIDBPersister('feishin');

createRoot(document.getElementById('root')!).render(
    <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
            // Bumped once to drop entries written before negative lyrics results were
            // excluded below. Those entries pinned "no lyrics found" permanently.
            buster: 'feishin-lyrics-v2',
            dehydrateOptions: {
                shouldDehydrateQuery: (query) => {
                    const isSuccess = query.state.status === 'success';
                    const isLyricsQueryKey =
                        query.queryKey.includes('song') &&
                        query.queryKey.includes('lyrics') &&
                        query.queryKey.includes('select');

                    if (!isSuccess || !isLyricsQueryKey) return false;

                    // "No lyrics found" is a success result too. Persisting it with
                    // maxAge Infinity would hide any sidecar or override added later,
                    // so only keep results that carry lyrics or deliberate user state.
                    return shouldPersistLyricsResult(query.state.data as LyricsQueryResult);
                },
            },
            hydrateOptions: {
                defaultOptions: {
                    queries: {
                        gcTime: Infinity,
                    },
                },
            },
            maxAge: Infinity,
            persister: indexedDbPersister,
        }}
    >
        <App />
    </PersistQueryClientProvider>,
);
