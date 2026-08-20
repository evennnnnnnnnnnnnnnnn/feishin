import { GenreListSort, LibraryItem, SortOrder } from '@feishin/core/types/domain-types';
import { ItemListKey } from '@feishin/core/types/types';
import { Divider } from '@feishin/ui/components/divider/divider';
import { Flex } from '@feishin/ui/components/flex/flex';
import { Group } from '@feishin/ui/components/group/group';

import { GENRE_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';

export const GenreListHeaderFilters = () => {
    return (
        <Flex justify="space-between">
            <Group gap="sm" w="100%">
                <ListSortByDropdown
                    defaultSortByValue={GenreListSort.NAME}
                    itemType={LibraryItem.GENRE}
                    listKey={ItemListKey.GENRE}
                />
                <Divider orientation="vertical" />
                <ListSortOrderToggleButton
                    defaultSortOrder={SortOrder.ASC}
                    listKey={ItemListKey.GENRE}
                />
                <ListRefreshButton listKey={ItemListKey.GENRE} />
            </Group>
            <Group gap="sm" wrap="nowrap">
                <ListDisplayTypeToggleButton listKey={ItemListKey.GENRE} />
                <ListConfigMenu
                    listKey={ItemListKey.GENRE}
                    tableColumnsData={GENRE_TABLE_COLUMNS}
                />
            </Group>
        </Flex>
    );
};
