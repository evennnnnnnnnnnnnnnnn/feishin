import { AppTheme } from '@feishin/ui/themes/app-theme-types';
import { useAppTheme } from '@feishin/ui/themes/use-app-theme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@feishin/ui/styles/global.css';
import { MantineProvider } from '@mantine/core';
import { useEffect } from 'react';

import { Shell } from '/@/remote/components/shell';
import { useIsDark, useReconnect } from '/@/remote/store';

export const App = () => {
    const isDark = useIsDark();
    const reconnect = useReconnect();

    useEffect(() => {
        reconnect();
    }, [reconnect]);

    const { mode, theme } = useAppTheme(isDark ? AppTheme.DEFAULT_DARK : AppTheme.DEFAULT_LIGHT);

    return (
        <MantineProvider defaultColorScheme={mode} theme={theme}>
            <Shell />
        </MantineProvider>
    );
};
