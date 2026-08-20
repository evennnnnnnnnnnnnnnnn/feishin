import { toast } from '@feishin/ui/components/toast/toast';
import { t } from 'i18next';
import isElectron from 'is-electron';

const ipc = isElectron() ? window.api.ipc : null;

export const openRestartRequiredToast = (message?: string) => {
    return toast.warn({
        autoClose: false,
        id: 'restart-toast',
        message: message || t('common.forceRestartRequired'),
        onClose: () => {
            ipc?.send('app-restart');
        },
        title: t('common.restartRequired'),
    });
};
