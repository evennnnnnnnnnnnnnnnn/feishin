import { closeAllModals, openModal } from '@mantine/modals';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
    useDeleteAlbumsFromLibrary,
    useDeleteSongsFromLibrary,
} from '/@/renderer/features/shared/mutations/delete-from-library-mutation';
import { useCurrentServerId, useIsNavidromeAdmin } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem } from '/@/shared/types/domain-types';

/**
 * Deleting media moves files out of the music folder, so the endpoint is admin-only and
 * Navidrome-only. Hide the affordance rather than let it 403.
 *
 * The server also has its own Deletion.Enabled switch, which the client cannot see. With it
 * off the request answers 403 and the toast shows the server's explanation - one clear
 * error beats a config round-trip on every menu open.
 */
export const useCanDeleteFromLibrary = useIsNavidromeAdmin;

interface DeleteFromLibraryActionProps {
    disabled?: boolean;
    ids: string[];
    itemType: LibraryItem.ALBUM | LibraryItem.SONG;
}

interface DeleteFromLibraryModalProps {
    description: string;
    onConfirm: () => Promise<void>;
}

/**
 * Owns the in-flight flag so the confirm button can show it. The modal renders in the
 * global provider, outside the action component, so a flag held up there would never reach
 * it - this wrapper is the closest thing to the button that can re-render.
 */
const DeleteFromLibraryModal = ({ description, onConfirm }: DeleteFromLibraryModalProps) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = useCallback(async () => {
        setIsDeleting(true);
        try {
            await onConfirm();
        } finally {
            setIsDeleting(false);
        }
    }, [onConfirm]);

    return (
        <ConfirmModal disabled={isDeleting} loading={isDeleting} onConfirm={handleConfirm}>
            <Text>{description}</Text>
        </ConfirmModal>
    );
};

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
        // Defence in depth behind the modal's own loading state: a double-click that lands
        // before React repaints would otherwise send the delete twice, and the second
        // request would find no rows and report a 404 over a delete that actually succeeded.
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
                <DeleteFromLibraryModal
                    description={t(
                        isAlbum
                            ? 'form.deleteFromLibrary.albumDescription'
                            : 'form.deleteFromLibrary.songDescription',
                        { count: ids.length },
                    )}
                    onConfirm={handleDelete}
                />
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
