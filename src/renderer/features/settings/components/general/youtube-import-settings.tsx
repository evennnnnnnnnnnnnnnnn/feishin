import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '/@/renderer/api';
import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import { useCurrentServer } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { ServerType, YoutubeImportResponse } from '/@/shared/types/domain-types';

/**
 * Import a track from a YouTube URL. The whole pipeline runs on the Navidrome
 * server (yt-dlp download into the library's YouTube/ folder, LRCLIB fetch
 * into a .lrc sidecar, rescan), so this section only submits the URL and
 * reports the outcome. Admin-only - the server enforces it, we just hide it.
 */
export const YoutubeImportSettings = () => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const [url, setUrl] = useState('');

    const importMutation = useMutation<YoutubeImportResponse, AxiosError>({
        mutationFn: () => {
            return api.controller.youtubeImport!({
                apiClientProps: { serverId: server?.id },
                body: { url: url.trim() },
            });
        },
        onError: (err) => {
            toast.error({
                message: (err.response?.data as string) || err.message,
                title: t('setting.youtubeImport.failed', {
                    defaultValue: 'Failed to import from YouTube',
                }),
            });
        },
        onSuccess: (data) => {
            const message = !data.lyricsFound
                ? t('setting.youtubeImport.successNoLyrics', {
                      defaultValue: '"{{title}}" was imported (no lyrics found on LRCLIB).',
                      title: data.title,
                  })
                : data.lyricsSynced
                  ? t('setting.youtubeImport.successSynced', {
                        defaultValue: '"{{title}}" was imported with synced lyrics.',
                        title: data.title,
                    })
                  : t('setting.youtubeImport.successPlain', {
                        defaultValue: '"{{title}}" was imported with plain lyrics.',
                        title: data.title,
                    });
            toast.success({ message });
            setUrl('');
        },
    });

    if (server?.type !== ServerType.NAVIDROME || !server?.isAdmin) {
        return null;
    }

    const isImporting = importMutation.isPending;

    const options: SettingOption[] = [
        {
            control: (
                <Group wrap="nowrap">
                    <TextInput
                        aria-label="YouTube URL"
                        disabled={isImporting}
                        onChange={(e) => setUrl(e.currentTarget.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={url}
                        width={280}
                    />
                    <Button
                        disabled={isImporting || url.trim() === ''}
                        loading={isImporting}
                        onClick={() => importMutation.mutate()}
                        variant="filled"
                    >
                        {isImporting
                            ? t('setting.youtubeImport.importing', { defaultValue: 'Importing…' })
                            : t('setting.youtubeImport.import', { defaultValue: 'Import' })}
                    </Button>
                </Group>
            ),
            description: t('setting.youtubeImport', {
                context: 'description',
                defaultValue:
                    'Download the audio of a YouTube video as an MP3 file into the YouTube folder of the server library, together with its synced lyrics from LRCLIB (as a .lrc file). Requires yt-dlp and FFmpeg on the server.',
            }),
            title: t('setting.youtubeImport', { defaultValue: 'Import from YouTube' }),
        },
    ];

    return (
        <SettingsSection
            options={options}
            title={t('setting.youtubeImport.sectionTitle', { defaultValue: 'Import from YouTube' })}
        />
    );
};
