import { ServerListItem } from '@feishin/core/types/types';
import i18n from '@feishin/i18n/i18n';
import { toast } from '@feishin/ui/components/toast/toast';
import isElectron from 'is-electron';

import { useAuthStore } from '/@/renderer/store';

const localSettings = isElectron() ? window.api.localSettings : null;

const AUTH_FAILURE_TOAST_ID = 'auth-failure';

export const authenticationFailure = (currentServer: null | ServerListItem, message?: string) => {
    const store = useAuthStore.getState();
    const serverId = currentServer?.id ?? store.currentServer?.id;

    toast.error({
        id: AUTH_FAILURE_TOAST_ID,
        message: message ?? (i18n.t('error.sessionExpiredError') as string),
    });

    if (!serverId) {
        return;
    }

    console.error(
        `token is expired: ${currentServer?.ndCredential ?? store.currentServer?.ndCredential}`,
    );
    localSettings?.passwordRemove(serverId);

    // logout() clears credentials on the server list entry and sets currentServer to null.
    // If there is no current server, still clear the matching server list entry.
    if (store.currentServer) {
        store.actions.logout();
    } else {
        store.actions.updateServer(serverId, {
            credential: '',
            ndCredential: undefined,
            savePassword: false,
        });
    }
};
