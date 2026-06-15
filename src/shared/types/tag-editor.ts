/** Editor field keys in taglib-wasm camelCase. Shared between main and renderer. */
export const EDITOR_FIELD_KEYS = [
    'title',
    'artist',
    'albumArtist',
    'album',
    'subtitle',
    'genre',
    'comment',
    'trackNumber',
    'totalTracks',
    'discNumber',
    'totalDiscs',
    'date',
    'originalDate',
    'bpm',
    'language',
    'media',
    'script',
    'grouping',
    'titleSort',
    'albumSort',
    'artistSort',
    'albumArtistSort',
    'composerSort',
    'composer',
    'producer',
    'lyricist',
    'conductor',
    'remixedBy',
    'isrc',
    'asin',
    'barcode',
    'catalogNumber',
    'label',
    'copyright',
    'mood',
    'originalAlbum',
    'originalArtist',
    'lyrics',
    'musicbrainzTrackId',
    'musicbrainzReleaseId',
    'musicbrainzReleaseGroupId',
    'musicbrainzReleaseTrackId',
    'musicbrainzWorkId',
    'musicbrainzArtistId',
    'musicbrainzReleaseArtistId',
    'acoustidId',
] as const;

export type ArtworkKind = 'common' | 'mixed' | 'none';

export type ArtworkOp = { bytes: Uint8Array; mimeType: string; type: 'set' } | { type: 'clear' };

export interface BatchFileError {
    error: string;
    path: string;
}

export interface BatchProgress {
    processed: number;
    total: number;
}

export type EditorFieldKey = (typeof EDITOR_FIELD_KEYS)[number];

export interface ReadLocalImageResult extends IpcResult {
    data?: string;
    mimeType?: string;
}

export interface ReadSongMetadataBatchResult extends IpcResult {
    artworkData?: string;
    artworkKind: ArtworkKind;
    artworkMimeType?: string;
    failedFiles?: BatchFileError[];
    readCount?: number;
    tagSummary?: Record<string, null | string>;
    totalCount?: number;
}

/** Subset of `window.api.utils` consumed by the metadata editor. */
export interface TagEditorUtils {
    cancelReadSongMetadata: () => void;
    offBatchProgress: (cb: (event: unknown, data: BatchProgress) => void) => void;
    onBatchProgress: (cb: (event: unknown, data: BatchProgress) => void) => void;
    readLocalImage: (filePath: string) => Promise<ReadLocalImageResult>;
    readSongMetadataBatch: (filePaths: string[]) => Promise<ReadSongMetadataBatchResult>;
    writeSongTagsBatch: (
        filePaths: string[],
        edits: Record<string, string>,
        removed: string[],
        artworkOp?: ArtworkOp,
    ) => Promise<WriteSongTagsBatchResult>;
}

export interface WriteSongTagsBatchResult extends IpcResult {
    failedFiles?: BatchFileError[];
}

interface IpcResult {
    error?: string;
    success: boolean;
}
