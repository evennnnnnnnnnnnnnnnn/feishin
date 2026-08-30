import { closeAllModals, openModal } from '@mantine/modals';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import {
    useDeleteAlbumsFromLibrary,
    useDeleteSongsFromLibrary,
} from '/@/renderer/features/shared/mutations/delete-from-library-mutation';
import { useCurrentServer, useCurrentServerId } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem, ServerType } from '/@/shared/types/domain-types';

/**
 * Deleting media moves files out of the music folder, so the endpoint is admin-only and
 * Navidrome-only. Hide the affordance rather than let it 403.
 *
 * The server also has its own Deletion.Enabled switch, which the client cannot see. With it
 * off the request answers 403 and the toast shows the server's explanation - one clear
 * error beats a config round-trip on every menu open.
 */
export const useCanDeleteFromLibrary = () => {
    const server = useCurrentServer();
    return server?.type === ServerType.NAVIDROME && Boolean(server?.isAdmin);
};

interface DeleteFromLibraryActionProps {
    disabled?: boolean;
    ids: string[];
    itemType: LibraryItem.ALBUM | LibraryItem.SONG;
}

export const DeleteFromLibraryAction = ({
    disabled,
    ids,
    itemType,
}: DeleteFromLibraryActionProps) => {
    const { t } = useTranslation();
    const serverId = useCurrentServerId();
    const canDelete = useCanDeleteFromLibrary();

    const submitting = useRef(false);

    const isAlbum = itemType === LibraryItem.ALBUM;
    const albumMutation = useDeleteAlbumsFromLibrary({});
    const songMutation = useDeleteSongsFromLibrary({});
    const mutation = isAlbum ? albumMutation : songMutation;

    const handleDelete = useCallback(async () => {
        if (ids.length === 0 || !serverId) return;
        // The modal renders in the global provider, outside this component, so it never
        // re-renders with a loading flag. A ref is what stops a double-click sending the
        // delete twice - the second request would find no rows and report a 404 over a
        // delete that actually succeeded.
        if (submitting.current) return;
        submitting.current = true;

        try {
            const result = await mutation.mutateAsync({
                apiClientProps: { serverId },
                query: { ids },
            });

            toast.success({
                message: t('form.deleteFromLibrary.success', { count: result.count }),
            });
        } catch (err: any) {
            toast.error({
                message: err.message,
                title: t('error.genericError'),
            });
        } finally {
            submitting.current = false;
        }

        closeAllModals();
    }, [ids, mutation, serverId, t]);

    const openDeleteModal = useCallback(() => {
        if (ids.length === 0) return;

        openModal({
            children: (
                <ConfirmModal onConfirm={handleDelete}>
                    <Text>
                        {t(
                            isAlbum
                                ? 'form.deleteFromLibrary.albumDescription'
                                : 'form.deleteFromLibrary.songDescription',
                            { count: ids.length },
                        )}
                    </Text>
                </ConfirmModal>
            ),
            title: t('form.deleteFromLibrary.title'),
        });
    }, [handleDelete, ids.length, isAlbum, t]);

    if (!canDelete || ids.length === 0) return null;

    return (
        <ContextMenu.Item disabled={disabled} leftIcon="delete" onSelect={openDeleteModal}>
            {t('action.deleteFromLibrary')}
        </ContextMenu.Item>
    );
};
