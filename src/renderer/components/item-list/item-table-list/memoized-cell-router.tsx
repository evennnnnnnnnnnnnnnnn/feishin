import { LibraryItem } from '@feishin/core/types/domain-types';
import { TableColumn } from '@feishin/core/types/types';
import React, { useMemo } from 'react';
import { CellComponentProps } from 'react-window-v2';

import { createColumnCellComponents } from './cell-component-factory';
import { TableItemProps } from './item-table-list';
import { ItemTableListColumn } from './item-table-list-column';

interface MemoizedCellRouterProps extends CellComponentProps<TableItemProps> {
    columnCellComponents: Map<TableColumn, React.ComponentType<CellComponentProps<TableItemProps>>>;
}

const MemoizedCellRouterBase = (props: MemoizedCellRouterProps) => {
    const columnType = props.columns[props.columnIndex]?.id as TableColumn;
    const ColumnComponent = props.columnCellComponents.get(columnType);

    if (ColumnComponent) {
        // eslint-disable-next-line react-hooks/static-components
        return <ColumnComponent {...props} />;
    }

    return <ItemTableListColumn {...props} />;
};

export const MemoizedCellRouter = MemoizedCellRouterBase;

export const useColumnCellComponents = (
    columns: TableColumn[],
    itemType: LibraryItem,
): Map<TableColumn, React.ComponentType<CellComponentProps<TableItemProps>>> => {
    const columnsKey = useMemo(() => columns.join(','), [columns]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => createColumnCellComponents(columns, itemType), [columnsKey, itemType]);
};
