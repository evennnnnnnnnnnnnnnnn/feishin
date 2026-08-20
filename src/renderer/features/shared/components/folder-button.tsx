import { ActionIcon, ActionIconProps } from '@feishin/ui/components/action-icon/action-icon';
import { useTranslation } from 'react-i18next';

interface FolderButtonProps extends ActionIconProps {
    isActive?: boolean;
}

export const FolderButton = ({ isActive, ...props }: FolderButtonProps) => {
    const { t } = useTranslation();

    return (
        <ActionIcon
            icon="folder"
            iconProps={{
                color: isActive ? 'primary' : undefined,
                size: 'lg',
                ...props.iconProps,
            }}
            tooltip={{
                label: t('entity.folder', { count: 1 }),
                ...props.tooltip,
            }}
            variant="subtle"
            {...props}
        />
    );
};
