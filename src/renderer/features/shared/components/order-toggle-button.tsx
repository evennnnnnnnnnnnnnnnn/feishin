import { SortOrder } from '@feishin/core/types/domain-types';
import { ActionIcon, ActionIconProps } from '@feishin/ui/components/action-icon/action-icon';
import { useTranslation } from 'react-i18next';

interface OrderToggleButtonProps {
    buttonProps?: Partial<ActionIconProps>;
    disabled?: boolean;
    onToggle: () => void;
    sortOrder: SortOrder;
}

export const OrderToggleButton = ({
    buttonProps,
    disabled,
    onToggle,
    sortOrder,
}: OrderToggleButtonProps) => {
    const { t } = useTranslation();

    return (
        <ActionIcon
            disabled={disabled}
            icon={sortOrder === SortOrder.ASC ? 'sortAsc' : 'sortDesc'}
            iconProps={{
                size: 'lg',
            }}
            onClick={onToggle}
            tooltip={{
                label: sortOrder === SortOrder.ASC ? t('common.ascending') : t('common.descending'),
            }}
            variant="subtle"
            {...buttonProps}
        />
    );
};
