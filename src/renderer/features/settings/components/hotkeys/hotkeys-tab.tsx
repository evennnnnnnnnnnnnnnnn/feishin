import { Divider } from '@feishin/ui/components/divider/divider';
import { Stack } from '@feishin/ui/components/stack/stack';
import isElectron from 'is-electron';
import { memo } from 'react';
import { Fragment } from 'react/jsx-runtime';

import { HotkeyManagerSettings } from '/@/renderer/features/settings/components/hotkeys/hotkey-manager-settings';
import { MediaSessionSettings } from '/@/renderer/features/settings/components/hotkeys/media-session-settings';
import { WindowHotkeySettings } from '/@/renderer/features/settings/components/hotkeys/window-hotkey-settings';

const sections = [
    { component: WindowHotkeySettings, hidden: !isElectron(), key: 'window' },
    { component: MediaSessionSettings, key: 'media-session' },
    { component: HotkeyManagerSettings, key: 'hotkey-manager' },
];

export const HotkeysTab = memo(() => {
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
