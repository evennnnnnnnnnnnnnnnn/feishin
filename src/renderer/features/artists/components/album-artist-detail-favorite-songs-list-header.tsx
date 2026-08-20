import { LibraryItem, Song } from '@feishin/core/types/domain-types';
import { Badge } from '@feishin/ui/components/badge/badge';
import { SpinnerIcon } from '@feishin/ui/components/spinner/spinner';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';

interface AlbumArtistDetailFavoriteSongsListHeaderProps {
    data: Song[];
    itemCount?: number;
    title: string;
}

export const AlbumArtistDetailFavoriteSongsListHeader = ({
    data,
    itemCount,
    title,
}: AlbumArtistDetailFavoriteSongsListHeaderProps) => {
    const { t } = useTranslation();

    return (
        <PageHeader>
            <LibraryHeaderBar ignoreMaxWidth>
                <LibraryHeaderBar.PlayButton itemType={LibraryItem.SONG} songs={data} />
                <LibraryHeaderBar.Title order={2}>
                    {t('page.albumArtistDetail.favoriteSongsFrom', { title })}
                </LibraryHeaderBar.Title>
                <Badge>
                    {itemCount === null || itemCount === undefined ? <SpinnerIcon /> : itemCount}
                </Badge>
            </LibraryHeaderBar>
        </PageHeader>
    );
};
