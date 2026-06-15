import { openModal } from '@mantine/modals';
import isElectron from 'is-electron';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { controller } from '/@/renderer/api/controller';
import { SongEditModal } from '/@/renderer/features/tag-editor/components/song-edit-modal';
import { useCurrentServer } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { Song } from '/@/shared/types/domain-types';

interface EditMetadataActionProps {
    albumIds?: string[];
    songs?: Song[];
}

const utils = isElectron() ? window.api.utils : null;

const getAlbumSongs = async (albumIds: string[], serverId: string): Promise<Song[]> => {
    const albumDetails = await Promise.all(
        albumIds.map((id) =>
            controller.getAlbumDetail({
                apiClientProps: { serverId },
                query: { id },
            }),
        ),
    );
    return albumDetails.flatMap((album) => album?.songs ?? []).filter((s) => s.path);
};

export const EditMetadataAction = ({ albumIds, songs: songItems }: EditMetadataActionProps) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const songs = useMemo(() => songItems?.filter((s) => s.path) ?? [], [songItems]);
    const count = albumIds?.length ?? songs.length;

    const onSelect = useCallback(async () => {
        let resolvedSongs: Song[];

        if (albumIds) {
            resolvedSongs = server?.id ? await getAlbumSongs(albumIds, server.id) : [];
        } else {
            resolvedSongs = songs;
        }

        const trackCount = resolvedSongs.length;
        openModal({
            children: <SongEditModal songs={resolvedSongs} />,
            size: 'xl',
            styles: { body: { paddingBottom: 'var(--theme-spacing-xl)' } },
            title:
                trackCount > 1
                    ? `${t('page.contextMenu.editMetadata')} (${trackCount} ${t('common.tracks', 'tracks')})`
                    : t('page.contextMenu.editMetadata'),
        });
    }, [albumIds, server, songs, t]);

    if (!utils) return null;

    return (
        <ContextMenu.Item disabled={count === 0} leftIcon="edit" onSelect={onSelect}>
            {t('page.contextMenu.editMetadata')}
        </ContextMenu.Item>
    );
};
