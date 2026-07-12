import { PROPERTIES } from 'taglib-wasm';

/** Tags pinned to the top of the editor table (most frequently edited). */
export const FIELD_PRIORITY: readonly string[] = [
    'title',
    'artist',
    'album',
    'albumArtist',
    'trackNumber',
    'discNumber',
    'date',
];

export interface KnownTag {
    key: string;
    label: string;
    type: TagFieldType;
}

/** Which form control to render for a tag row. */
export type TagFieldType = 'boolean' | 'number' | 'string' | 'textarea';

/**
 * Per-key overrides and extras. Keys present in taglib-wasm PROPERTIES get their
 * label/type overridden; keys absent from PROPERTIES are appended as extra entries.
 */
const TAG_CONFIG: Record<string, { label?: string; type?: TagFieldType }> = {
    acoustidFingerprint: { type: 'textarea' },
    acoustidId: { label: 'AcoustID' },
    albumArtist: { label: 'Album Artist' },
    albumArtistSort: { label: 'Album Artist Sort' },
    albumSort: { label: 'Album Sort' },
    // extras not in PROPERTIES (common MusicBrainz Picard tags)
    ARTISTS: { label: 'Artists', type: 'string' },
    artistSort: { label: 'Artist Sort' },
    bpm: { type: 'number' },
    catalogNumber: { label: 'Catalog Number' },
    comment: { type: 'textarea' },
    composerSort: { label: 'Composer Sort' },
    discNumber: { label: 'Disc Number' },
    lyrics: { type: 'textarea' },
    musicbrainzArtistId: { label: 'MusicBrainz Artist ID' },
    musicbrainzReleaseArtistId: { label: 'MusicBrainz Album Artist ID' },
    musicbrainzReleaseGroupId: { label: 'MusicBrainz Release Group ID' },
    musicbrainzReleaseId: { label: 'MusicBrainz Album ID' },
    musicbrainzReleaseTrackId: { label: 'MusicBrainz Release Track ID' },
    musicbrainzTrackId: { label: 'MusicBrainz Track ID' },
    musicbrainzWorkId: { label: 'MusicBrainz Work ID' },
    originalAlbum: { label: 'Original Album' },
    originalArtist: { label: 'Original Artist' },
    originalDate: { label: 'Original Date' },
    ORIGINALYEAR: { label: 'Original Year', type: 'number' },
    RELEASECOUNTRY: { label: 'Release Country', type: 'string' },
    RELEASESTATUS: { label: 'Release Status', type: 'string' },
    RELEASETYPE: { label: 'Release Type', type: 'string' },
    remixedBy: { label: 'Remixer' },
    titleSort: { label: 'Title Sort' },
    totalDiscs: { label: 'Total Discs' },
    totalTracks: { label: 'Total Tracks' },
    trackNumber: { label: 'Track Number' },
};

const humanizeKey = (key: string): string =>
    key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase())
        .trim();

/** Field definitions derived from taglib-wasm's PROPERTIES plus any extras in TAG_CONFIG. */
export const KNOWN_TAGS: KnownTag[] = [
    ...Object.entries(PROPERTIES).map(([key, prop]) => {
        const cfg = TAG_CONFIG[key];
        return {
            key,
            label: cfg?.label ?? humanizeKey(key),
            type: cfg?.type ?? (prop.type as TagFieldType),
        };
    }),
    ...Object.entries(TAG_CONFIG)
        .filter(([key]) => !(key in PROPERTIES))
        .map(([key, cfg]) => ({
            key,
            label: cfg.label ?? humanizeKey(key),
            type: cfg.type ?? ('string' as TagFieldType),
        })),
];

export const KNOWN_TAG_MAP = new Map(KNOWN_TAGS.map((t) => [t.key, t]));

/**
 * Resolves a user-typed string to a canonical tag key.
 * Matches by label first (e.g. "Album Sort" → "albumSort"), then falls back to
 * the raw input. Unknown keys are uppercased so TagLib writes them as valid
 * Vorbis comment field names.
 */
export const resolveTagKey = (input: string): string => {
    const byLabel = KNOWN_TAGS.find((t) => t.label.toLowerCase() === input.toLowerCase());
    const key = byLabel?.key ?? input;
    return KNOWN_TAG_MAP.has(key) ? key : key.toUpperCase();
};
