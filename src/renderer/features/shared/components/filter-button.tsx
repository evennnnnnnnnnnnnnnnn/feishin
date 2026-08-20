import { ActionIcon, ActionIconProps } from '@feishin/ui/components/action-icon/action-icon';
import { useTranslation } from 'react-i18next';

interface FilterButtonProps extends ActionIconProps {
    isActive?: boolean;
}

export const FilterButton = ({ isActive, onClick, ...props }: FilterButtonProps) => {
    const { t } = useTranslation();

    return (
        <ActionIcon
            icon="filter"
            iconProps={{
                fill: isActive ? 'primary' : undefined,
                size: 'lg',
                ...props.iconProps,
            }}
            onClick={onClick}
            tooltip={{
                label: t('common.filters', { count: 2 }),
                ...props.tooltip,
            }}
            variant="subtle"
            {...props}
        />
    );
};
