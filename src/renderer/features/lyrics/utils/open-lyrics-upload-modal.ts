import { closeModal, openModal } from '@mantine/modals';
import { createElement } from 'react';

import i18n from '/@/i18n/i18n';
import {
    LyricsUploadModal,
    LyricsUploadModalProps,
} from '/@/renderer/features/lyrics/components/lyrics-upload-modal';

const MODAL_ID = 'lyrics-upload';

/** Open the "supply lyrics for this song" composer over the current track. */
export const openLyricsUploadModal = (props: Omit<LyricsUploadModalProps, 'onClose'>) => {
    openModal({
        children: createElement(LyricsUploadModal, {
            ...props,
            onClose: () => closeModal(MODAL_ID),
        }),
        modalId: MODAL_ID,
        size: 'lg',
        title: i18n.t('lyricsUpload.title', { postProcess: 'sentenceCase' }) as string,
    });
};
