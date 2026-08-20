import { Divider } from '@feishin/ui/components/divider/divider';
import { Stack } from '@feishin/ui/components/stack/stack';
import isElectron from 'is-electron';
import { memo } from 'react';
import { Fragment } from 'react/jsx-runtime';

import { DiscordSettings } from '/@/renderer/features/settings/components/window/discord-settings';
import { PasswordSettings } from '/@/renderer/features/settings/components/window/password-settings';
import { RemoteSettings } from '/@/renderer/features/settings/components/window/remote-settings';
import { WindowSettings } from '/@/renderer/features/settings/components/window/window-settings';

const utils = isElectron() ? window.api.utils : null;

const sections = [
    { component: WindowSettings, key: 'window' },
    { component: DiscordSettings, key: 'discord' },
    { component: RemoteSettings, key: 'remote' },
    { component: PasswordSettings, hidden: !utils?.isLinux(), key: 'password' },
];

export const WindowTab = memo(() => {
    return (
        <Stack gap="md">
            {sections.map(({ component: Section, hidden, key }, index) => (
                <Fragment key={key}>
                    {!hidden && <Section />}
                    {index < sections.length - 1 && <Divider />}
                </Fragment>
            ))}
        </Stack>
    );
});
