import { hasFeature } from '@feishin/core/api/utils';
import { ServerType } from '@feishin/core/types/domain-types';
import { ServerFeature } from '@feishin/core/types/features-types';
import { Box } from '@feishin/ui/components/box/box';
import { DropdownMenu } from '@feishin/ui/components/dropdown-menu/dropdown-menu';
import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { ScrollArea } from '@feishin/ui/components/scroll-area/scroll-area';
import { Stack } from '@feishin/ui/components/stack/stack';
import { Text } from '@feishin/ui/components/text/text';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import styles from './server-selector.module.css';

import JellyfinLogo from '/@/renderer/features/servers/assets/jellyfin.png';
import NavidromeLogo from '/@/renderer/features/servers/assets/navidrome.png';
import OpenSubsonicLogo from '/@/renderer/features/servers/assets/opensubsonic.png';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { useScanStatus } from '/@/renderer/features/shared/hooks/use-scan-status';
import { ServerSelectorItems } from '/@/renderer/features/sidebar/components/server-selector-items';
import { useCurrentServer } from '/@/renderer/store';

export const ServerSelector = () => {
    const { t } = useTranslation();
    const currentServer = useCurrentServer();
    const { data: scanStatus, isScanning, isWatching } = useScanStatus();

    const { data: musicFolders } = useQuery(
        currentServer
            ? sharedQueries.musicFolders({ query: null, serverId: currentServer.id })
            : { enabled: false, queryKey: ['disabled'] },
    );

    if (!currentServer) {
        return null;
    }

    const supportsMultiSelect = hasFeature(currentServer, ServerFeature.MUSIC_FOLDER_MULTISELECT);

    const selectedMusicFolders =
        musicFolders?.items.filter((folder) => currentServer.musicFolderId?.includes(folder.id)) ||
        [];

    const musicFolderDisplayText = (() => {
        if (selectedMusicFolders.length === 0) {
            return t('page.appMenu.noMusicFolder');
        }

        if (supportsMultiSelect && selectedMusicFolders.length > 1) {
            return t('page.appMenu.multipleMusicFolders', {
                count: selectedMusicFolders.length,
            });
        }

        return selectedMusicFolders[0].name;
    })();

    const scanProgressParts: string[] = [];
    if (scanStatus?.count && scanStatus.count > 0) {
        scanProgressParts.push(t('common.scanItemCount', { count: scanStatus.count }));
    }
    if (scanStatus?.folderCount && scanStatus.folderCount > 0) {
        scanProgressParts.push(t('common.scanFolderCount', { count: scanStatus.folderCount }));
    }

    const scanStatusText =
        isWatching && isScanning
            ? [t('common.scanningLibrary'), ...scanProgressParts].filter(Boolean).join(' · ')
            : null;

    const logo =
        currentServer.type === ServerType.NAVIDROME
            ? NavidromeLogo
            : currentServer.type === ServerType.JELLYFIN
              ? JellyfinLogo
              : OpenSubsonicLogo;

    return (
        <DropdownMenu offset={0} position="right-start" withinPortal={false}>
            <DropdownMenu.Target>
                <div className={styles.popoverTarget}>
                    <Box className={styles.buttonContainer}>
                        <Group className={styles.buttonGroup} gap="sm">
                            <img className={styles.logo} src={logo} />
                            <Stack className={styles.buttonStack} gap={2}>
                                <Text fw={600} size="sm" truncate>
                                    {currentServer.name}
                                </Text>
                                <Text isMuted size="xs" truncate>
                                    {musicFolderDisplayText}
                                </Text>
                                {scanStatusText && (
                                    <Text isMuted size="xs" truncate>
                                        {scanStatusText}
                                    </Text>
                                )}
                            </Stack>
                            <Icon icon="ellipsisVertical" size="sm" />
                        </Group>
                    </Box>
                </div>
            </DropdownMenu.Target>
            <DropdownMenu.Dropdown miw="16rem">
                <ScrollArea className={styles.scrollArea}>
                    <ServerSelectorItems />
                </ScrollArea>
            </DropdownMenu.Dropdown>
        </DropdownMenu>
    );
};
