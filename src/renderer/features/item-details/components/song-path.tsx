import { ActionIcon } from '@feishin/ui/components/action-icon/action-icon';
import { CopyButton } from '@feishin/ui/components/copy-button/copy-button';
import { Group } from '@feishin/ui/components/group/group';
import { Icon } from '@feishin/ui/components/icon/icon';
import { Text } from '@feishin/ui/components/text/text';
import { toast } from '@feishin/ui/components/toast/toast';
import { Tooltip } from '@feishin/ui/components/tooltip/tooltip';
import isElectron from 'is-electron';
import { useTranslation } from 'react-i18next';

import { useResolvedSongPath } from '/@/renderer/utils/resolve-song-path';

const util = isElectron() ? window.api.utils : null;

export type SongPathProps = {
    path: null | string;
};

export const SongPath = ({ path }: SongPathProps) => {
    const { t } = useTranslation();
    const resolvedPath = useResolvedSongPath(path);

    if (!resolvedPath) return null;

    return (
        <Group>
            <CopyButton timeout={2000} value={resolvedPath}>
                {({ copied, copy }) => (
                    <Tooltip
                        label={t(
                            copied ? 'page.itemDetail.copiedPath' : 'page.itemDetail.copyPath',
                            {},
                        )}
                        withinPortal
                    >
                        <ActionIcon onClick={copy} variant="transparent">
                            {copied ? <Icon icon="check" /> : <Icon icon="clipboardCopy" />}
                        </ActionIcon>
                    </Tooltip>
                )}
            </CopyButton>
            {util && (
                <Tooltip label={t('page.itemDetail.openFile')} withinPortal>
                    <ActionIcon
                        icon="externalLink"
                        onClick={() => {
                            util.openItem(resolvedPath).catch((error) => {
                                toast.error({
                                    message: (error as Error).message,
                                    title: t('error.openError'),
                                });
                            });
                        }}
                        variant="transparent"
                    />
                </Tooltip>
            )}
            <Text style={{ userSelect: 'all' }}>{resolvedPath}</Text>
        </Group>
    );
};
