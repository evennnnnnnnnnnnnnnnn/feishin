import { closeAllModals, openModal } from '@mantine/modals';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '/@/i18n/i18n';
import { api } from '/@/renderer/api';
import { useCurrentServer, useIsNavidromeAdmin } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { YoutubeImportResponse } from '/@/shared/types/domain-types';

/**
 * Import a track from a YouTube URL. The whole pipeline runs on the Navidrome
 * server (yt-dlp download into the library's YouTube/ folder, LRCLIB fetch
 * into a .lrc sidecar, rescan), so this form only submits the URL and reports
 * the outcome. Admin-only - the server enforces it, callers hide it.
 */
export const YoutubeImportForm = ({ onSuccess }: { onSuccess?: () => void }) => {
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
                title: t('form.youtubeImport.failed'),
            });
        },
        onSuccess: (data) => {
            const message = !data.lyricsFound
                ? t('form.youtubeImport.successNoLyrics', {
                      title: data.title,
                  })
                : data.lyricsSynced
                  ? t('form.youtubeImport.successSynced', {
                        title: data.title,
                    })
                  : t('form.youtubeImport.successPlain', {
                        title: data.title,
                    });
            toast.success({ message });
            setUrl('');
            onSuccess?.();
        },
    });

    const isImporting = importMutation.isPending;

    return (
        <Stack gap="md">
            <Text isMuted size="sm">
                {t('form.youtubeImport.description')}
            </Text>
            <TextInput
                aria-label="YouTube URL"
                data-autofocus
                disabled={isImporting}
                label={t('form.youtubeImport.input')}
                onChange={(e) => setUrl(e.currentTarget.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && url.trim() !== '' && !isImporting) {
                        importMutation.mutate();
                    }
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
            />
            <Group justify="flex-end">
                <Button
                    disabled={isImporting || url.trim() === ''}
                    loading={isImporting}
                    onClick={() => importMutation.mutate()}
                    variant="filled"
                >
                    {isImporting
                        ? t('form.youtubeImport.importing')
                        : t('form.youtubeImport.import')}
                </Button>
            </Group>
        </Stack>
    );
};

/**
 * True when the current server supports the import and the account may use it.
 */
export const useCanYoutubeImport = useIsNavidromeAdmin;

export const openYoutubeImportModal = () => {
    openModal({
        children: <YoutubeImportForm onSuccess={() => closeAllModals()} />,
        size: 'lg',
        title: i18n.t('form.youtubeImport.title') as string,
    });
};
