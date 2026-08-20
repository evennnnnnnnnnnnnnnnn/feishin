import { sortRadioList } from '@feishin/core/api/utils';
import { LibraryItem, RadioListSort, SortOrder } from '@feishin/core/types/domain-types';
import { ItemListKey } from '@feishin/core/types/types';
import { ScrollArea } from '@feishin/ui/components/scroll-area/scroll-area';
import { Spinner } from '@feishin/ui/components/spinner/spinner';
import { Stack } from '@feishin/ui/components/stack/stack';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useMemo } from 'react';

import { useListContext } from '/@/renderer/context/list-context';
import { radioQueries } from '/@/renderer/features/radio/api/radio-api';
import { RadioListItems } from '/@/renderer/features/radio/components/radio-list-items';
import { useSearchTermFilter } from '/@/renderer/features/shared/hooks/use-search-term-filter';
import { useSortByFilter } from '/@/renderer/features/shared/hooks/use-sort-by-filter';
import { useSortOrderFilter } from '/@/renderer/features/shared/hooks/use-sort-order-filter';
import { searchLibraryItems } from '/@/renderer/features/shared/utils';
import { useCurrentServer } from '/@/renderer/store';

export const RadioListContent = () => {
    const server = useCurrentServer();
    const { setItemCount } = useListContext();
    const { searchTerm } = useSearchTermFilter();
    const { sortBy } = useSortByFilter<RadioListSort>(RadioListSort.NAME, ItemListKey.RADIO);
    const { sortOrder } = useSortOrderFilter(SortOrder.ASC, ItemListKey.RADIO);

    const radioListQuery = useQuery({
        ...radioQueries.list({
            query: undefined,
            serverId: server?.id || '',
        }),
    });

    const filteredAndSortedRadioStations = useMemo(() => {
        let stations = radioListQuery.data || [];

        if (searchTerm) {
            stations = searchLibraryItems(stations, searchTerm, LibraryItem.RADIO_STATION);
        }

        if (sortBy && sortOrder) {
            stations = sortRadioList(stations, sortBy, sortOrder);
        }

        return stations;
    }, [radioListQuery.data, searchTerm, sortBy, sortOrder]);

    useEffect(() => {
        setItemCount?.(filteredAndSortedRadioStations.length || 0);
    }, [filteredAndSortedRadioStations.length, setItemCount]);

    if (radioListQuery.isLoading) {
        return <Spinner container />;
    }

    return (
        <Suspense fallback={<Spinner container />}>
            <ScrollArea>
                <Stack p="md">
                    <RadioListItems data={filteredAndSortedRadioStations} />
                </Stack>
            </ScrollArea>
        </Suspense>
    );
};
