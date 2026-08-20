import { ArtistListSort, LibraryItem, SortOrder } from '@feishin/core/types/domain-types';
import { ItemListKey } from '@feishin/core/types/types';
import { Divider } from '@feishin/ui/components/divider/divider';
import { Flex } from '@feishin/ui/components/flex/flex';
import { Group } from '@feishin/ui/components/group/group';
import { useQuery } from '@tanstack/react-query';

import { ALBUM_ARTIST_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSelectFilter } from '/@/renderer/features/shared/components/list-select-filter';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { FILTER_KEYS } from '/@/renderer/features/shared/utils';
import { useCurrentServer } from '/@/renderer/store';

export const ArtistListHeaderFilters = () => {
    const server = useCurrentServer();

    const rolesQuery = useQuery(sharedQueries.roles({ query: {}, serverId: server.id }));

    return (
        <Flex justify="space-between">
            <Group gap="sm" w="100%">
                <ListSortByDropdown
                    defaultSortByValue={ArtistListSort.NAME}
                    itemType={LibraryItem.ARTIST}
                    listKey={ItemListKey.ARTIST}
                />
                <Divider orientation="vertical" />
                <ListSortOrderToggleButton
                    defaultSortOrder={SortOrder.ASC}
                    listKey={ItemListKey.ARTIST}
                />
                {rolesQuery.data && rolesQuery.data.length > 0 && (
                    <>
                        <Divider orientation="vertical" />
                        <ListSelectFilter
                            data={rolesQuery.data}
                            filterKey={FILTER_KEYS.ARTIST.ROLE}
                            listKey={ItemListKey.ARTIST}
                        />
                    </>
                )}
                <ListRefreshButton listKey={ItemListKey.ARTIST} />
            </Group>
            <Group gap="sm" wrap="nowrap">
                <ListDisplayTypeToggleButton listKey={ItemListKey.ARTIST} />
                <ListConfigMenu
                    listKey={ItemListKey.ARTIST}
                    tableColumnsData={ALBUM_ARTIST_TABLE_COLUMNS}
                />
            </Group>
        </Flex>
    );
};
