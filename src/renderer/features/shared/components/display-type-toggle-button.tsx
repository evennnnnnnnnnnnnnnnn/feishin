import { ListDisplayType } from '@feishin/core/types/types';
import { ActionIcon, ActionIconProps } from '@feishin/ui/components/action-icon/action-icon';
import { useTranslation } from 'react-i18next';

interface DisplayTypeToggleButtonProps {
    buttonProps?: Partial<ActionIconProps>;
    displayType: ListDisplayType;
    onToggle: () => void;
}

export const DisplayTypeToggleButton = ({
    buttonProps,
    displayType,
    onToggle,
}: DisplayTypeToggleButtonProps) => {
    const { t } = useTranslation();
    const isGrid = displayType === ListDisplayType.GRID;
    const isDetail = displayType === ListDisplayType.DETAIL;

    return (
        <ActionIcon
            icon={isGrid ? 'layoutGrid' : isDetail ? 'layoutDetail' : 'layoutTable'}
            iconProps={{
                size: 'lg',
            }}
            onClick={onToggle}
            tooltip={{
                label: isGrid
                    ? t('table.config.view.grid')
                    : isDetail
                      ? t('table.config.view.detail')
                      : t('table.config.view.table'),
            }}
            variant="subtle"
            {...buttonProps}
        />
    );
};
