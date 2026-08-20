import { ActionIcon, ActionIconProps } from '@feishin/ui/components/action-icon/action-icon';
import { useTranslation } from 'react-i18next';

interface SettingsButtonProps extends ActionIconProps {}

export const SettingsButton = ({ ...props }: SettingsButtonProps) => {
    const { t } = useTranslation();

    return (
        <ActionIcon
            icon="settings"
            iconProps={{
                size: 'lg',
                ...props.iconProps,
            }}
            tooltip={{
                label: t('common.configure'),
                ...props.tooltip,
            }}
            variant="subtle"
            {...props}
        />
    );
};
