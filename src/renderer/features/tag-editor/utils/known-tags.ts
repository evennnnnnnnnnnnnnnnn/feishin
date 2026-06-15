import type { EditorFieldKey } from '/@/shared/types/tag-editor';

import { EDITOR_FIELD_KEYS } from '/@/shared/types/tag-editor';

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

/** Human-readable labels where auto-generated text is awkward. */
const FIELD_LABEL_OVERRIDES: Partial<Record<EditorFieldKey, string>> = {
    acoustidId: 'AcoustID',
    albumArtist: 'Album Artist',
    albumArtistSort: 'Album Artist Sort',
    albumSort: 'Album Sort',
    artistSort: 'Artist Sort',
    catalogNumber: 'Catalog Number',
    composerSort: 'Composer Sort',
    discNumber: 'Disc Number',
    musicbrainzArtistId: 'MusicBrainz Artist ID',
    musicbrainzReleaseArtistId: 'MusicBrainz Album Artist ID',
    musicbrainzReleaseGroupId: 'MusicBrainz Release Group ID',
    musicbrainzReleaseId: 'MusicBrainz Album ID',
    musicbrainzReleaseTrackId: 'MusicBrainz Release Track ID',
    musicbrainzTrackId: 'MusicBrainz Track ID',
    musicbrainzWorkId: 'MusicBrainz Work ID',
    originalAlbum: 'Original Album',
    originalArtist: 'Original Artist',
    originalDate: 'Original Date',
    remixedBy: 'Remixer',
    titleSort: 'Title Sort',
    totalDiscs: 'Total Discs',
    totalTracks: 'Total Tracks',
    trackNumber: 'Track Number',
};

/** Input widget overrides (taglib metadata type is not always specific enough). */
const FIELD_TYPE_OVERRIDES: Partial<
    Record<EditorFieldKey, 'boolean' | 'number' | 'string' | 'textarea'>
> = {
    bpm: 'number',
    comment: 'textarea',
    lyrics: 'textarea',
};

export interface KnownTag {
    key: string;
    label: string;
    type: TagFieldType;
}

/** Which form control to render for a tag row. */
export type TagFieldType = 'boolean' | 'number' | 'string' | 'textarea';

const humanizeKey = (key: string): string =>
    key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase())
        .trim();

const resolveFieldType = (key: string): TagFieldType =>
    FIELD_TYPE_OVERRIDES[key as EditorFieldKey] ?? 'string';

/** Field definitions used to render the tag editor table and "Add field" dropdown. */
export const KNOWN_TAGS: KnownTag[] = EDITOR_FIELD_KEYS.map((key) => ({
    key,
    label: FIELD_LABEL_OVERRIDES[key] ?? humanizeKey(key),
    type: resolveFieldType(key),
}));

export const KNOWN_TAG_MAP = new Map(KNOWN_TAGS.map((t) => [t.key, t]));
