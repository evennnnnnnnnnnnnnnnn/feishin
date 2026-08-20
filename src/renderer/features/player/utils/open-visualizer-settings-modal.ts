import i18n from '@feishin/i18n/i18n';
import { openContextModal } from '@mantine/modals';

export const openVisualizerSettingsModal = () => {
    openContextModal({
        innerProps: {},
        modal: 'visualizerSettings',
        overlayProps: {
            blur: 0,
            opacity: 0,
        },
        size: 'xl',
        styles: {
            content: {
                height: '90%',
                maxWidth: '1400px',
                minHeight: '600px',
                width: '100%',
            },
        },
        title: i18n.t('common.setting', { count: 2 }),
        transitionProps: {
            transition: 'pop',
        },
    });
};
