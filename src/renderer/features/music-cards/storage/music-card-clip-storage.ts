import { logger } from '/@/renderer/utils/logger';

// Audio clips are far too large for the localStorage-backed zustand persist
// store the rest of a card lives in, so they get their own IndexedDB database.
// One object store keyed by snippet id, no indexes - a hand-rolled promise
// wrapper is cheaper here than pulling in another dependency.
const DB_NAME = 'feishin-music-cards';
const DB_VERSION = 1;
const STORE_NAME = 'clips';

let dbPromise: null | Promise<IDBDatabase> = null;

const openDb = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is unavailable'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error ?? new Error('Failed to open clip database'));

        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME);
            }
        };
    });

    // A failed open must not be cached, or every later call fails with it
    dbPromise.catch(() => {
        dbPromise = null;
    });

    return dbPromise;
};

const runTransaction = async <T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
    const db = await openDb();

    return new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = run(transaction.objectStore(STORE_NAME));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Clip storage request failed'));
        transaction.onabort = () =>
            reject(transaction.error ?? new Error('Clip storage transaction aborted'));
    });
};

// Clips are the standalone half of a card: ask the browser not to evict this
// origin's storage under pressure. Best-effort and prompt-free in Chromium
// (granted automatically in Electron and for installed/engaged origins).
let persistRequested = false;

const requestPersistentStorage = () => {
    if (persistRequested) return;
    persistRequested = true;
    navigator.storage?.persist?.().catch(() => {});
};

export const putSnippetClip = async (snippetId: string, clip: Blob): Promise<void> => {
    requestPersistentStorage();
    await runTransaction('readwrite', (store) => store.put(clip, snippetId));
};

export const getSnippetClip = async (snippetId: string): Promise<Blob | undefined> => {
    return runTransaction<Blob | undefined>('readonly', (store) => store.get(snippetId));
};

export const deleteSnippetClip = async (snippetId: string): Promise<void> => {
    await runTransaction('readwrite', (store) => store.delete(snippetId));
};

/**
 * Deletes every stored clip whose snippet id is not in `keepIds` - blobs
 * orphaned by a cleared local store or an interrupted delete would otherwise
 * accumulate forever. Best-effort: the deck must render even if this fails.
 */
export const sweepSnippetClips = async (keepIds: ReadonlySet<string>): Promise<void> => {
    try {
        const keys = await runTransaction<IDBValidKey[]>('readonly', (store) => store.getAllKeys());
        const orphaned = keys.filter(
            (key): key is string => typeof key === 'string' && !keepIds.has(key),
        );

        if (orphaned.length > 0) {
            logger.info('Sweeping orphaned music card clips', { count: orphaned.length });
            await deleteSnippetClips(orphaned);
        }
    } catch (error) {
        logger.warn('Music card clip sweep failed', { error: String(error) });
    }
};

/** Best-effort cleanup - a card removal must not fail because a blob was already gone */
export const deleteSnippetClips = async (snippetIds: string[]): Promise<void> => {
    for (const snippetId of snippetIds) {
        try {
            await deleteSnippetClip(snippetId);
        } catch (error) {
            logger.warn('Failed to delete music card clip', {
                error: String(error),
                snippetId,
            });
        }
    }
};
