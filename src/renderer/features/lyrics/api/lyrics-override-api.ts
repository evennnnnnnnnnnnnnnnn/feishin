import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import {
    getLyricLineStartMs,
    getLyricLineText,
    normalizeLyrics,
} from '/@/renderer/features/lyrics/api/lyrics-utils';
import { toast } from '/@/shared/components/toast/toast';
import {
    LyricsOverrideEntry,
    LyricsOverrideList,
    SynchronizedLyrics,
} from '/@/shared/types/domain-types';

// Server-side, an override with no lang set is stored as-is; navidrome only
// defaults *kind* server-side (EffectiveKind), not lang, so this is a plain
// placeholder for "unspecified" rather than a real BCP-47 code.
const UNDETERMINED_LANG = 'xxx';

export const buildLyricsOverridePayload = (
    meta: { artist?: string; name?: string },
    lines: SynchronizedLyrics,
): LyricsOverrideList => {
    const entry: LyricsOverrideEntry = {
        displayArtist: meta.artist || undefined,
        displayTitle: meta.name || undefined,
        lang: UNDETERMINED_LANG,
        line: normalizeLyrics(lines).map((line) => ({
            start: getLyricLineStartMs(line),
            value: getLyricLineText(line),
        })),
        synced: true,
    };

    return [entry];
};

export const useSaveLyricsOverrideMutation = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({
            payload,
            serverId,
            songId,
        }: {
            payload: LyricsOverrideList;
            serverId: string;
            songId: string;
        }) =>
            api.controller.saveLyricsOverride?.({
                apiClientProps: { serverId },
                body: payload,
                query: { songId },
            }),
        onError: (error: unknown) => {
            toast.error({
                message: error instanceof Error ? error.message : String(error),
                title: t('lyricsEditor.saveFailed'),
            });
        },
        onSuccess: (_data, { serverId, songId }) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.songs.lyrics(serverId, { songId }),
            });
        },
    });
};
