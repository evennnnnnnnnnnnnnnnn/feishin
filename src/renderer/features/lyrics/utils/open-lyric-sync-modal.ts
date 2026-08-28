import { closeModal, openModal } from '@mantine/modals';
import { createElement } from 'react';

import i18n from '/@/i18n/i18n';
import {
    LyricSyncModal,
    LyricSyncModalProps,
} from '/@/renderer/features/lyrics/components/lyric-sync-modal';

const MODAL_ID = 'lyric-sync';

/**
 * Open tap-to-sync lyric timing over the current song. The modal is tall and
 * fixed-height because its line list scrolls internally and the save bar has to
 * stay reachable while the song plays underneath.
 */
export const openLyricSyncModal = (props: Omit<LyricSyncModalProps, 'onClose'>) => {
    openModal({
        children: createElement(LyricSyncModal, {
            ...props,
            onClose: () => closeModal(MODAL_ID),
        }),
        modalId: MODAL_ID,
        size: 'xl',
        styles: {
            body: {
                display: 'flex',
                flexDirection: 'column',
                height: '70vh',
                minHeight: '420px',
            },
        },
        title: i18n.t('lyricsEditor.syncTitle') as string,
    });
};
