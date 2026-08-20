import { Divider } from '@feishin/ui/components/divider/divider';
import { Stack } from '@feishin/ui/components/stack/stack';
import { memo } from 'react';
import { Fragment } from 'react/jsx-runtime';

import { AnalyticsSettings } from '/@/renderer/features/settings/components/advanced/analytics-settings';
import { ExportImportSettings } from '/@/renderer/features/settings/components/advanced/export-import-settings';
import { LoggerSettings } from '/@/renderer/features/settings/components/advanced/logger-settings';
import { CacheSettings } from '/@/renderer/features/settings/components/window/cache-settngs';
import { UpdateSettings } from '/@/renderer/features/settings/components/window/update-settings';

const sections = [
    { component: UpdateSettings, key: 'update' },
    { component: AnalyticsSettings, key: 'analytics' },
    { component: ExportImportSettings, key: 'export-import' },
    { component: LoggerSettings, key: 'logger' },
    { component: CacheSettings, key: 'cache' },
];

export const AdvancedTab = memo(() => {
    return (
        <Stack gap="md">
            {sections.map(({ component: Section, key }, index) => (
                <Fragment key={key}>
                    <Section />
                    {index < sections.length - 1 && <Divider />}
                </Fragment>
            ))}
        </Stack>
    );
});
