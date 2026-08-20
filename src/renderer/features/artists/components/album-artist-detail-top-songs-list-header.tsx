import { LibraryItem, Song } from '@feishin/core/types/domain-types';
import { Badge } from '@feishin/ui/components/badge/badge';
import { SpinnerIcon } from '@feishin/ui/components/spinner/spinner';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';

interface AlbumArtistDetailTopSongsListHeaderProps {
    data: Song[];
    itemCount?: number;
    title: string;
}

export const AlbumArtistDetailTopSongsListHeader = ({
    data,
    itemCount,
    title,
}: AlbumArtistDetailTopSongsListHeaderProps) => {
    const { t } = useTranslation();

    return (
        <PageHeader>
            <LibraryHeaderBar ignoreMaxWidth>
                <LibraryHeaderBar.PlayButton itemType={LibraryItem.SONG} songs={data} />
                <LibraryHeaderBar.Title order={2}>
                    {t('page.albumArtistDetail.topSongsFrom', { title })}
                </LibraryHeaderBar.Title>
                <Badge>
                    {itemCount === null || itemCount === undefined ? <SpinnerIcon /> : itemCount}
                </Badge>
            </LibraryHeaderBar>
        </PageHeader>
    );
};
