import { Play } from '@feishin/core/types/types';
import { ActionIcon } from '@feishin/ui/components/action-icon/action-icon';
import { Flex } from '@feishin/ui/components/flex/flex';
import { HoverCard } from '@feishin/ui/components/hover-card/hover-card';
import { Text } from '@feishin/ui/components/text/text';
import clsx from 'clsx';
import { ReactNode, useCallback } from 'react';

import styles from './row-index-column.module.css';

import {
    ItemTableListInnerColumn,
    TableColumnContainer,
    TableColumnTextContainer,
} from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { ItemListItem } from '/@/renderer/components/item-list/types';
import { ItemRowPlayControls } from '/@/renderer/features/shared/components/item-row-play-controls';

export const RowPlayControlCell = (
    props: ItemTableListInnerColumn & {
        indexContent: ReactNode;
        onPlay: (playType: Play) => void;
        showPlayControls: boolean;
    },
) => {
    const {
        controls,
        data,
        enableExpansion,
        getRowItem,
        indexContent,
        internalState,
        itemType,
        onPlay,
        rowIndex,
        showPlayControls,
    } = props;

    const handleExpand = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            const item = (getRowItem?.(rowIndex) ?? data[rowIndex]) as ItemListItem;
            const rowId = internalState.extractRowId(item);
            const index = rowId ? internalState.findItemIndex(rowId) : -1;
            controls.onExpand?.({
                event: e,
                index,
                internalState,
                item,
                itemType,
            });
        },
        [controls, data, getRowItem, internalState, itemType, rowIndex],
    );

    const getIndexDisplay = (useMutedText: boolean) => {
        const hideOnHoverClass = enableExpansion ? 'hide-on-hover' : undefined;

        if (typeof indexContent === 'number') {
            return useMutedText ? (
                <Text className={hideOnHoverClass} isMuted isNoSelect>
                    {indexContent}
                </Text>
            ) : (
                indexContent
            );
        }

        return <span className={hideOnHoverClass}>{indexContent}</span>;
    };

    const expansionTarget = (
        <div className={styles.playTarget}>
            {getIndexDisplay(true)}
            <ActionIcon
                className={clsx(styles.expand, 'hover-only')}
                icon="arrowDownS"
                iconProps={{ color: 'muted', size: 'md' }}
                onClick={handleExpand}
                size="xs"
                variant="subtle"
            />
        </div>
    );

    if (enableExpansion) {
        return (
            <TableColumnContainer {...props} className={styles.expansionCell}>
                <div className={styles.expansionInner}>
                    {showPlayControls ? (
                        <HoverCard openDelay={300} position="top" withArrow withinPortal={false}>
                            <HoverCard.Target>{expansionTarget}</HoverCard.Target>
                            <HoverCard.Dropdown onClick={(e) => e.stopPropagation()}>
                                <ItemRowPlayControls onPlay={onPlay} />
                            </HoverCard.Dropdown>
                        </HoverCard>
                    ) : (
                        expansionTarget
                    )}
                </div>
            </TableColumnContainer>
        );
    }

    if (!showPlayControls) {
        return (
            <TableColumnTextContainer {...props}>{getIndexDisplay(false)}</TableColumnTextContainer>
        );
    }

    return (
        <TableColumnTextContainer {...props} className={styles.fullSizeContent}>
            <HoverCard openDelay={300} position="top" withArrow withinPortal={false}>
                <HoverCard.Target>
                    <Flex className={styles.indexContent} justify="center" w="100%">
                        {getIndexDisplay(false)}
                    </Flex>
                </HoverCard.Target>
                <HoverCard.Dropdown onClick={(e) => e.stopPropagation()}>
                    <ItemRowPlayControls onPlay={onPlay} />
                </HoverCard.Dropdown>
            </HoverCard>
        </TableColumnTextContainer>
    );
};
