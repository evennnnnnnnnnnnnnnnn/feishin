import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './editable-lyric-line.module.css';

import { LyricTextEditor } from '/@/renderer/features/lyrics/components/lyric-text-editor';
import { LyricTimeEditor } from '/@/renderer/features/lyrics/components/lyric-time-editor';
import { LyricLine } from '/@/renderer/features/lyrics/lyric-line';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';

interface EditableLyricLineProps {
    alignment: 'center' | 'left' | 'right';
    editing: 'text' | 'time' | null;
    fontSize: number;
    lineId: string;
    onCancelEdit: () => void;
    onCommitText: (text: string) => void;
    onCommitTime: (ms: number) => void;
    onPreview: (ms: number) => void;
    onSetCurrentTime: () => void;
    onStartEdit: (field: 'text' | 'time') => void;
    romajiText?: null | string;
    startMs: number;
    text: string;
    translatedText?: null | string;
}

// Admin-only per-line editing chrome for synced lyrics: right-click offers
// set-to-current-time / edit time / edit text (Museeks interaction model),
// gated by canEditLyrics in the caller (isAdmin + Navidrome server type).
export const EditableLyricLine = memo((props: EditableLyricLineProps) => {
    const {
        alignment,
        editing,
        fontSize,
        lineId,
        onCancelEdit,
        onCommitText,
        onCommitTime,
        onPreview,
        onSetCurrentTime,
        onStartEdit,
        romajiText,
        startMs,
        text,
        translatedText,
    } = props;
    const { t } = useTranslation();

    if (editing === 'time') {
        return (
            <div className={styles.editingRow} data-lyric-time={startMs}>
                <LyricTimeEditor
                    initialMs={startMs}
                    onCancel={onCancelEdit}
                    onPreview={onPreview}
                    onSubmit={onCommitTime}
                />
            </div>
        );
    }

    if (editing === 'text') {
        return (
            <div className={styles.editingRow} data-lyric-time={startMs}>
                <LyricTextEditor
                    initialValue={text}
                    onCancel={onCancelEdit}
                    onSubmit={onCommitText}
                />
            </div>
        );
    }

    return (
        <ContextMenu>
            <ContextMenu.Target>
                {/* LyricLine is not forwardRef; wrap in a real DOM node so Radix's
                    asChild trigger reliably opens on right-click. */}
                <div>
                    <LyricLine
                        alignment={alignment}
                        className="lyric-line synchronized"
                        data-lyric-time={startMs}
                        fontSize={fontSize}
                        id={lineId}
                        romajiText={romajiText}
                        text={text}
                        translatedText={translatedText}
                    />
                </div>
            </ContextMenu.Target>
            <ContextMenu.Content>
                <ContextMenu.Item leftIcon="duration" onSelect={onSetCurrentTime}>
                    {t('lyricsEditor.setTimeToCurrent')}
                </ContextMenu.Item>
                <ContextMenu.Item leftIcon="edit" onSelect={() => onStartEdit('time')}>
                    {t('lyricsEditor.editTime')}
                </ContextMenu.Item>
                <ContextMenu.Item leftIcon="edit" onSelect={() => onStartEdit('text')}>
                    {t('lyricsEditor.editText')}
                </ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu>
    );
});

EditableLyricLine.displayName = 'EditableLyricLine';
