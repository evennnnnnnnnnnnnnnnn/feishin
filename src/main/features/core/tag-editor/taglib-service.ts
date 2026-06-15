import type { ArtworkKind, ArtworkOp, BatchFileError } from '/@/shared/types/tag-editor';
import type { ICommonTagsResult } from 'music-metadata';

import { EDITOR_FIELD_KEYS } from '/@/shared/types/tag-editor';

import { constants, promises as fsPromises } from 'fs';
import * as mm from 'music-metadata';
import { TagLib } from 'taglib-wasm';

import { getImageMimeTypeFromPath } from '/@/shared/utils/image-mime';

let _taglib: null | TagLib = null;

const getTagLib = async (): Promise<TagLib> => {
    if (!_taglib) _taglib = await TagLib.initialize();
    return _taglib;
};

const BATCH_CONCURRENCY = 8;

/** Reads an image file and returns it as base64 + MIME type for IPC transport to the renderer. */
export async function readLocalImageFile(filePath: string) {
    const buf = await fsPromises.readFile(filePath);
    return {
        data: buf.toString('base64'),
        mimeType: getImageMimeTypeFromPath(filePath),
    };
}

const pickFrontCover = <T extends { type?: string }>(pictures: T[]): T | undefined =>
    pictures.find((p) => p.type === 'Front Cover') ?? pictures[0];

type TagAccessor = (c: ICommonTagsResult) => null | number | string | undefined;

// Only fields where the editor key differs from the music-metadata key.
const MM_RENAMES: Partial<Record<string, keyof ICommonTagsResult>> = {
    acoustidId: 'acoustid_id',
    albumArtist: 'albumartist',
    albumArtistSort: 'albumartistsort',
    albumSort: 'albumsort',
    artistSort: 'artistsort',
    catalogNumber: 'catalognumber',
    composerSort: 'composersort',
    musicbrainzArtistId: 'musicbrainz_artistid',
    musicbrainzReleaseArtistId: 'musicbrainz_albumartistid',
    musicbrainzReleaseGroupId: 'musicbrainz_releasegroupid',
    musicbrainzReleaseId: 'musicbrainz_albumid',
    musicbrainzReleaseTrackId: 'musicbrainz_trackid',
    musicbrainzTrackId: 'musicbrainz_recordingid',
    musicbrainzWorkId: 'musicbrainz_workid',
    originalAlbum: 'originalalbum',
    originalArtist: 'originalartist',
    originalDate: 'originaldate',
    remixedBy: 'remixer',
    titleSort: 'titlesort',
};

// Only fields that need sub-property access or live on a nested object.
const MM_CUSTOM: Partial<Record<string, TagAccessor>> = {
    comment: (c) => c.comment?.[0]?.text,
    discNumber: (c) => c.disk.no,
    lyrics: (c) => c.lyrics?.[0]?.text,
    totalDiscs: (c) => c.disk.of,
    totalTracks: (c) => c.track.of,
    trackNumber: (c) => c.track.no,
};

/** Maps a music-metadata `ICommonTagsResult` to the flat camelCase key map used by the editor. */
export function flattenMusicMetadata(common: ICommonTagsResult): Record<string, string> {
    const flat: Record<string, string> = {};
    for (const key of EDITOR_FIELD_KEYS) {
        const custom = MM_CUSTOM[key];
        const raw: unknown = custom
            ? custom(common)
            : common[(MM_RENAMES[key] ?? key) as keyof ICommonTagsResult];
        const value = Array.isArray(raw) ? raw[0] : raw;
        if (value != null && value !== '') flat[key] = String(value);
    }
    return flat;
}

/** Returns an error entry for each path that is missing or not writable by the current process. */
export async function checkPathsWritable(paths: string[]): Promise<BatchFileError[]> {
    const failed: BatchFileError[] = [];
    await Promise.all(
        paths.map(async (filePath) => {
            try {
                await fsPromises.access(filePath, constants.F_OK | constants.W_OK);
            } catch (err) {
                failed.push({
                    error: err instanceof Error ? err.message : String(err),
                    path: filePath,
                });
            }
        }),
    );
    return failed;
}

/** Runs `fn` over `items` with at most `concurrency` tasks in flight at once. Stops early if `signal` is aborted. */
const mapWithConcurrency = async <T>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<void>,
    signal?: AbortSignal,
): Promise<void> => {
    let nextIndex = 0;
    const worker = async () => {
        while (nextIndex < items.length) {
            if (signal?.aborted) return;
            const index = nextIndex;
            nextIndex += 1;
            await fn(items[index]);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
};

/**
 * Reads tags and artwork from a batch of audio files via music-metadata (which preserves full ISO dates).
 * Values that differ across files are merged to `null` and shown as "(Multiple Values)" in the editor.
 * Artwork bytes are only loaded for one representative file, after confirming all files share the same cover.
 */
export async function readFilesMetadataBatch(
    filePaths: string[],
    onProgress?: (processed: number, total: number) => void,
    signal?: AbortSignal,
): Promise<{
    artworkData?: string;
    artworkKind: ArtworkKind;
    artworkMimeType?: string;
    failedFiles: BatchFileError[];
    success: boolean;
    readCount: number;
    tagSummary: Record<string, null | string>;
    totalCount: number;
}> {
    const totalCount = filePaths.length;
    const failedFiles: BatchFileError[] = [];

    // Merged incrementally; safe because JS is single-threaded between awaits.
    const tagSummary: Record<string, null | string> = {};
    let artworkKind = 'none' as ArtworkKind;
    let artworkByteSize: number | undefined;
    let firstSuccessPath: string | undefined;
    let readCount = 0;
    let processed = 0;

    await mapWithConcurrency(
        filePaths,
        BATCH_CONCURRENCY,
        async (filePath) => {
            try {
                const { common } = await mm.parseFile(filePath);
                const flat = flattenMusicMetadata(common);
                const hasCoverArt = (common.picture?.length ?? 0) > 0;
                // Only access artwork bytes if we still need them for comparison.
                const picSize =
                    artworkKind !== 'mixed' && hasCoverArt
                        ? pickFrontCover(common.picture!)?.data.length
                        : undefined;
                // common.picture's Uint8Array is not stored anywhere — eligible for GC here.

                if (readCount === 0) {
                    // First success: seed the summary.
                    Object.assign(tagSummary, flat);
                    firstSuccessPath = filePath;
                    artworkKind = hasCoverArt ? 'common' : 'none';
                    artworkByteSize = picSize;
                } else {
                    // Merge tags: keys already null stay null; new divergences become null.
                    for (const k of Object.keys(tagSummary)) {
                        if (tagSummary[k] !== null && flat[k] !== tagSummary[k])
                            tagSummary[k] = null;
                    }
                    for (const k of Object.keys(flat)) {
                        if (!(k in tagSummary)) tagSummary[k] = null;
                    }
                    // Merge artwork.
                    if (artworkKind !== 'mixed') {
                        if (
                            hasCoverArt !== (artworkKind === 'common') ||
                            picSize !== artworkByteSize
                        ) {
                            artworkKind = 'mixed';
                        }
                    }
                }

                readCount += 1;
            } catch (err) {
                failedFiles.push({
                    error: err instanceof Error ? err.message : String(err),
                    path: filePath,
                });
            }
            processed += 1;
            onProgress?.(processed, totalCount);
        },
        signal,
    );

    let artworkData: string | undefined;
    let artworkMimeType: string | undefined;

    // Re-read artwork from one file only after confirming all files share the same cover.
    if (artworkKind === 'common' && firstSuccessPath) {
        const { common } = await mm.parseFile(firstSuccessPath);
        const pic = pickFrontCover(common.picture ?? []);
        if (pic) {
            artworkData = Buffer.from(pic.data).toString('base64');
            artworkMimeType = pic.format;
        }
    }

    return {
        artworkKind,
        failedFiles,
        success: readCount > 0,
        readCount,
        tagSummary,
        totalCount,
        ...(artworkData ? { artworkData, artworkMimeType } : {}),
    };
}

/**
 * Writes tag edits and/or artwork to a batch of audio files in-place via taglib-wasm (WASI).
 * Only the fields present in `edits`/`removed` are touched — all other existing tags are preserved.
 * Fields in `removed` are written as empty strings, which clears them in TagLib.
 */
export async function writeFilesTags(
    filePaths: string[],
    edits: Record<string, string>,
    removed: string[],
    artworkOp?: ArtworkOp,
    onProgress?: (processed: number, total: number) => void,
): Promise<{ failedFiles: BatchFileError[]; success: boolean }> {
    const notWritable = await checkPathsWritable(filePaths);
    const notWritableSet = new Set(notWritable.map((f) => f.path));

    const writablePaths = filePaths.filter((p) => !notWritableSet.has(p));
    const failedFiles: BatchFileError[] = [...notWritable];

    if (writablePaths.length === 0) {
        return { failedFiles, success: false };
    }

    const mergedEdits: Record<string, string> = { ...edits };
    for (const key of removed) {
        mergedEdits[key] = '';
    }

    const hasEdits = Object.keys(mergedEdits).length > 0;

    if (!hasEdits && !artworkOp) {
        return { failedFiles, success: failedFiles.length === 0 };
    }

    const taglib = await getTagLib();
    let processed = 0;
    const total = writablePaths.length;

    await mapWithConcurrency(writablePaths, BATCH_CONCURRENCY, async (path) => {
        try {
            await taglib.edit(path, (file) => {
                for (const [k, v] of Object.entries(mergedEdits)) {
                    file.setProperty(k.toUpperCase(), v);
                }
                if (artworkOp?.type === 'clear') {
                    file.removePictures();
                } else if (artworkOp?.type === 'set') {
                    file.removePictures();
                    file.addPicture({
                        data: artworkOp.bytes,
                        mimeType: artworkOp.mimeType,
                        type: 'FrontCover',
                    });
                }
            });
        } catch (err) {
            failedFiles.push({ error: String(err), path });
        }
        processed += 1;
        onProgress?.(processed, total);
    });

    return { failedFiles, success: failedFiles.length === 0 };
}
