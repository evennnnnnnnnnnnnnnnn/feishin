import { getAppTheme } from '@feishin/ui/themes/app-theme';
import { AppTheme } from '@feishin/ui/themes/app-theme-types';
import { createMantineTheme } from '@feishin/ui/themes/mantine-theme';
import { useMemo } from 'react';

export const useAppTheme = (theme: AppTheme | string) => {
    const appTheme = useMemo(() => getAppTheme(theme), [theme]);

    const mantineTheme = useMemo(() => createMantineTheme(appTheme), [appTheme]);

    return { mode: appTheme.mode ?? 'dark', theme: mantineTheme };
};
