import { Song } from '@feishin/core/types/domain-types';

import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ItemControls, ItemTableListColumnConfig } from '/@/renderer/components/item-list/types';

export interface ItemDetailListCellProps {
    columns?: ItemTableListColumnConfig[];
    controls?: ItemControls;
    internalState?: ItemListStateActions;
    isMutatingFavorite?: boolean;
    isRowHovered?: boolean;
    onFavoriteClick?: (song: Song) => void;
    rowIndex?: number;
    size?: 'compact' | 'default' | 'large';
    song: Song;
}
