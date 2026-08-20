import { ActionIcon } from '@feishin/ui/components/action-icon/action-icon';
import { RiRestartLine } from 'react-icons/ri';

import { useConnected, useReconnect } from '/@/remote/store';

export const ReconnectButton = () => {
    const connected = useConnected();
    const reconnect = useReconnect();

    return (
        <ActionIcon
            onClick={() => reconnect()}
            tooltip={{
                label: connected ? 'Reconnect' : 'Not connected. Reconnect.',
            }}
            variant="default"
        >
            <RiRestartLine
                color={connected ? 'var(--theme-colors-primary)' : 'var(--theme-colors-foreground)'}
                size={30}
            />
        </ActionIcon>
    );
};
