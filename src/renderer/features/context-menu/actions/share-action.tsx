import { LibraryItem } from '@feishin/core/types/domain-types';
import { ContextMenu } from '@feishin/ui/components/context-menu/context-menu';
import { openContextModal } from '@mantine/modals';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface ShareActionProps {
    ids: string[];
    itemType: LibraryItem;
}

export const ShareAction = ({ ids, itemType }: ShareActionProps) => {
    const { t } = useTranslation();

    const resourceType = useMemo(() => {
        switch (itemType) {
            case LibraryItem.ALBUM:
                return 'album';
            case LibraryItem.ALBUM_ARTIST:
                return 'albumArtist';
            case LibraryItem.FOLDER:
                return 'folder';
            case LibraryItem.PLAYLIST:
                return 'playlist';
            case LibraryItem.SONG:
                return 'song';
            default:
                return 'song';
        }
    }, [itemType]);

    const onSelect = useCallback(() => {
        openContextModal({
            innerProps: {
                itemIds: ids,
                resourceType,
            },
            modal: 'shareItem',
            title: t('page.contextMenu.shareItem'),
        });
    }, [ids, resourceType, t]);

    return (
        <ContextMenu.Item leftIcon="share" onSelect={onSelect}>
            {t('page.contextMenu.shareItem')}
        </ContextMenu.Item>
    );
};
