import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSaveLyricsSidecarMutation } from '/@/renderer/features/lyrics/api/lyrics-sidecar-api';
import { Button } from '/@/shared/components/button/button';
import { FileButton } from '/@/shared/components/file-button/file-button';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { Textarea } from '/@/shared/components/textarea/textarea';
import { toast } from '/@/shared/components/toast/toast';

export type LyricsUploadModalProps = {
    onClose: () => void;
    serverId: string;
    songId: string;
};

/**
 * Supply lyrics for a song that has none, by picking an .lrc file or pasting
 * its text. Picking a file fills the same textarea rather than uploading
 * straight away, so the content is always reviewable (and correctable) before
 * it is written to the library.
 */
export const LyricsUploadModal = ({ onClose, serverId, songId }: LyricsUploadModalProps) => {
    const { t } = useTranslation();
    const saveLyricsSidecar = useSaveLyricsSidecarMutation();

    const [content, setContent] = useState('');
    const [fileName, setFileName] = useState<null | string>(null);

    const handleFile = useCallback(
        async (file: File | null) => {
            if (!file) return;

            try {
                // Read as text so the browser decodes it; a UTF-8 BOM is stripped
                // again server-side by the lyrics reader, so it is harmless here.
                const text = await file.text();
                setContent(text);
                setFileName(file.name);
            } catch (error) {
                toast.error({
                    message: error instanceof Error ? error.message : String(error),
                    title: t('lyricsUpload.readFailed', { postProcess: 'sentenceCase' }),
                });
            }
        },
        [t],
    );

    const handleSave = useCallback(async () => {
        if (!content.trim()) return;

        try {
            await saveLyricsSidecar.mutateAsync({ content, serverId, songId });
            toast.success({
                message: t('lyricsUpload.saved', { postProcess: 'sentenceCase' }),
            });
            onClose();
        } catch (error) {
            // The server refuses unparseable text before writing anything, and
            // its message says why, so show it verbatim.
            toast.error({
                message: error instanceof Error ? error.message : String(error),
                title: t('lyricsUpload.saveFailed', { postProcess: 'sentenceCase' }),
            });
        }
    }, [content, onClose, saveLyricsSidecar, serverId, songId, t]);

    return (
        <Stack gap="md">
            <Text isMuted size="sm">
                {t('lyricsUpload.description', { postProcess: 'sentenceCase' })}
            </Text>

            <Group gap="sm">
                <FileButton accept=".lrc,.txt,text/plain" onChange={handleFile}>
                    {(props) => (
                        <Button {...props} variant="default">
                            {t('lyricsUpload.chooseFile', { postProcess: 'sentenceCase' })}
                        </Button>
                    )}
                </FileButton>
                {fileName ? (
                    <Text isMuted size="sm">
                        {fileName}
                    </Text>
                ) : null}
            </Group>

            <Textarea
                autosize
                maxRows={16}
                minRows={10}
                onChange={(event) => setContent(event.currentTarget.value)}
                placeholder={'[00:10.03] ...'}
                spellCheck={false}
                value={content}
            />

            <Group gap="sm" justify="end">
                <Button onClick={onClose} variant="default">
                    {t('common.cancel', { postProcess: 'sentenceCase' })}
                </Button>
                <Button
                    disabled={!content.trim()}
                    loading={saveLyricsSidecar.isPending}
                    onClick={handleSave}
                    variant="filled"
                >
                    {t('common.save', { postProcess: 'sentenceCase' })}
                </Button>
            </Group>
        </Stack>
    );
};
