import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatLrcTime, parseLrcTime } from '/@/renderer/features/lyrics/api/lyrics-time-format';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { TextInput } from '/@/shared/components/text-input/text-input';

const NUDGE_MS = 100;

interface LyricTimeEditorProps {
    initialMs: number;
    onCancel: () => void;
    onPreview: (ms: number) => void;
    onSubmit: (ms: number) => void;
}

// Interaction model ported from Museeks' TimeEditor (src/routes/lyrics.tsx):
// mm:ss.xx validation, +/-0.1s nudge via Up/Down or steppers, 1s preview,
// Enter commits, Esc/blur cancels. onMouseDown preventDefault on the stepper
// and preview buttons keeps the input focused so a click on them does not
// blur (and therefore cancel) the editor.
export const LyricTimeEditor = ({
    initialMs,
    onCancel,
    onPreview,
    onSubmit,
}: LyricTimeEditorProps) => {
    const { t } = useTranslation();
    const [value, setValue] = useState(() => formatLrcTime(initialMs));
    const parsedMs = parseLrcTime(value);
    const isValid = parsedMs !== null;

    const nudge = (deltaMs: number) => {
        if (parsedMs !== null) {
            setValue(formatLrcTime(Math.max(0, parsedMs + deltaMs)));
        }
    };

    const keepFocus = (event: React.MouseEvent) => {
        event.preventDefault();
    };

    return (
        <Group gap={4} onClick={(event) => event.stopPropagation()} wrap="nowrap">
            <TextInput
                autoFocus
                onBlur={onCancel}
                onChange={(event) => setValue(event.currentTarget.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        if (parsedMs !== null) {
                            onSubmit(parsedMs);
                        }
                    } else if (event.key === 'Escape') {
                        onCancel();
                    } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        nudge(NUDGE_MS);
                    } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        nudge(-NUDGE_MS);
                    }
                }}
                placeholder={t('lyricsEditor.timePlaceholder')}
                styles={{ input: { fontVariantNumeric: 'tabular-nums', textAlign: 'center' } }}
                value={value}
                width={96}
            />
            <ActionIcon
                aria-label="+0.1s"
                disabled={!isValid}
                icon="arrowUpS"
                onClick={() => nudge(NUDGE_MS)}
                onMouseDown={keepFocus}
                size="sm"
                variant="subtle"
            />
            <ActionIcon
                aria-label="-0.1s"
                disabled={!isValid}
                icon="arrowDownS"
                onClick={() => nudge(-NUDGE_MS)}
                onMouseDown={keepFocus}
                size="sm"
                variant="subtle"
            />
            <ActionIcon
                aria-label={t('lyricsEditor.preview')}
                disabled={!isValid}
                icon="mediaPlay"
                onClick={() => parsedMs !== null && onPreview(parsedMs)}
                onMouseDown={keepFocus}
                size="sm"
                tooltip={{ label: t('lyricsEditor.preview'), openDelay: 0 }}
                variant="subtle"
            />
        </Group>
    );
};
