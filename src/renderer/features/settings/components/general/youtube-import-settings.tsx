import { useTranslation } from 'react-i18next';

import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import {
    useCanYoutubeImport,
    YoutubeImportForm,
} from '/@/renderer/features/youtube-import/components/youtube-import-form';

/**
 * Settings home for the YouTube import. The form itself is shared with the
 * app-menu modal (youtube-import-form.tsx); this section only wraps it in the
 * settings layout and hides it for non-admin or non-Navidrome servers.
 */
export const YoutubeImportSettings = () => {
    const { t } = useTranslation();
    const canImport = useCanYoutubeImport();

    if (!canImport) {
        return null;
    }

    const options: SettingOption[] = [
        {
            control: <></>,
            description: t('form.youtubeImport.requires'),
            title: t('form.youtubeImport.title'),
        },
    ];

    return (
        <SettingsSection
            extra={<YoutubeImportForm />}
            options={options}
            title={t('form.youtubeImport.title')}
        />
    );
};
