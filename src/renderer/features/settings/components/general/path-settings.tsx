import { Played } from '@feishin/core/types/domain-types';
import { ActionIcon } from '@feishin/ui/components/action-icon/action-icon';
import { Code } from '@feishin/ui/components/code/code';
import { Group } from '@feishin/ui/components/group/group';
import { Stack } from '@feishin/ui/components/stack/stack';
import { TextInput } from '@feishin/ui/components/text-input/text-input';
import { Text } from '@feishin/ui/components/text/text';
import { useDebouncedCallback } from '@feishin/ui/hooks/use-debounced-callback';
import { useQuery } from '@tanstack/react-query';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { useCurrentServerId, useGeneralSettings, useSettingsStoreActions } from '/@/renderer/store';
import { useResolvedSongPath } from '/@/renderer/utils/resolve-song-path';

interface PathSettingsProps {
    persistImmediately?: boolean;
    previewPath?: null | string;
}

export const PathSettings = memo(
    ({ persistImmediately = false, previewPath }: PathSettingsProps) => {
        const { t } = useTranslation();
        const serverId = useCurrentServerId();
        const randomSong = useQuery({
            ...songsQueries.random({
                query: { limit: 1, played: Played.All },
                serverId,
            }),
            enabled: previewPath === undefined,
            gcTime: Infinity,
            staleTime: Infinity,
        });

        const { pathReplace, pathReplaceWith } = useGeneralSettings();
        const { setSettings } = useSettingsStoreActions();
        const resolvedPreviewPath = useResolvedSongPath(
            previewPath === undefined ? randomSong.data?.items[0]?.path : previewPath,
        );

        const [localPathReplace, setLocalPathReplace] = useState(pathReplace);
        const [localPathReplaceWith, setLocalPathReplaceWith] = useState(pathReplaceWith);

        useEffect(() => {
            setLocalPathReplace(pathReplace);
        }, [pathReplace]);

        useEffect(() => {
            setLocalPathReplaceWith(pathReplaceWith);
        }, [pathReplaceWith]);

        const debouncedSetPathReplace = useDebouncedCallback((value: string) => {
            setSettings({
                general: {
                    pathReplace: value,
                },
            });
        }, 500);

        const debouncedSetPathReplaceWith = useDebouncedCallback((value: string) => {
            setSettings({
                general: {
                    pathReplaceWith: value,
                },
            });
        }, 500);

        return (
            <Stack>
                <Group>
                    <Text>{t('setting.pathReplace')}</Text>
                    {previewPath === undefined && (
                        <ActionIcon
                            icon="refresh"
                            loading={randomSong.isFetching}
                            onClick={() => randomSong.refetch()}
                            size="xs"
                            variant="transparent"
                        />
                    )}
                </Group>
                <Code>
                    <Text isMuted size="md">
                        {resolvedPreviewPath || ''}
                    </Text>
                </Code>
                <Group grow>
                    <TextInput
                        onChange={(e) => {
                            const value = e.currentTarget.value;
                            setLocalPathReplace(value);
                            if (persistImmediately) {
                                setSettings({ general: { pathReplace: value } });
                            } else {
                                debouncedSetPathReplace(value);
                            }
                        }}
                        placeholder={t('setting.pathReplace_optionRemovePrefix')}
                        value={localPathReplace}
                    />
                    <TextInput
                        onChange={(e) => {
                            const value = e.currentTarget.value;
                            setLocalPathReplaceWith(value);
                            if (persistImmediately) {
                                setSettings({ general: { pathReplaceWith: value } });
                            } else {
                                debouncedSetPathReplaceWith(value);
                            }
                        }}
                        placeholder={t('setting.pathReplace_optionAddPrefix')}
                        value={localPathReplaceWith}
                    />
                </Group>
            </Stack>
        );
    },
);
