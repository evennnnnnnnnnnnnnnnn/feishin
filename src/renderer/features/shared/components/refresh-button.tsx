import { ActionIcon, ActionIconProps } from '@feishin/ui/components/action-icon/action-icon';
import { useTranslation } from 'react-i18next';

interface RefreshButtonProps extends ActionIconProps {
    loading?: boolean;
}

export const RefreshButton = ({ loading, onClick, ...props }: RefreshButtonProps) => {
    const { t } = useTranslation();

    return (
        <ActionIcon
            icon="refresh"
            iconProps={{
                size: 'lg',
                ...props.iconProps,
            }}
            loading={loading}
            onClick={onClick}
            tooltip={{
                label: t('common.refresh'),
                ...props.tooltip,
            }}
            variant="subtle"
            {...props}
        />
    );
};
