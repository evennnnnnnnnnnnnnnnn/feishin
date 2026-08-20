import { LibraryItem } from '@feishin/core/types/domain-types';
import { Group } from '@feishin/ui/components/group/group';
import { Stack } from '@feishin/ui/components/stack/stack';
import { useTranslation } from 'react-i18next';

import { useIsFetchingItemListCount } from '/@/renderer/components/item-list/helpers/use-is-fetching-item-list';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { FolderListHeaderFilters } from '/@/renderer/features/folders/components/folder-list-header-filters';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';

interface FolderListHeaderProps {
    title?: string;
}

export const FolderListHeader = ({ title }: FolderListHeaderProps) => {
    const { t } = useTranslation();

    const pageTitle = title || t('page.folderList.title');

    return (
        <Stack gap={0}>
            <PageHeader>
                <LibraryHeaderBar ignoreMaxWidth>
                    <Stack>
                        <LibraryHeaderBar.Title>{pageTitle}</LibraryHeaderBar.Title>
                    </Stack>
                    <FolderListHeaderBadge />
                </LibraryHeaderBar>
                <Group>
                    <ListSearchInput />
                </Group>
            </PageHeader>
            <FilterBar>
                <FolderListHeaderFilters />
            </FilterBar>
        </Stack>
    );
};

const FolderListHeaderBadge = () => {
    const { itemCount } = useListContext();

    const isFetching = useIsFetchingItemListCount({
        itemType: LibraryItem.FOLDER,
    });

    return <LibraryHeaderBar.Badge isLoading={isFetching}>{itemCount}</LibraryHeaderBar.Badge>;
};
