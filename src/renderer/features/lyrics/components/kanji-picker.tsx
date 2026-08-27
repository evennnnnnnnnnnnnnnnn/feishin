import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { kataToHira } from '../../../../main/features/core/lyrics/furigana';
import styles from './kanji-picker.module.css';

import '/@/renderer/features/lyrics/i18n-furigana';
import { FuriganaBinding } from '/@/renderer/features/lyrics/api/furigana-render-model';
import { useKanjiInfo } from '/@/renderer/features/lyrics/hooks/use-kanji-info';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Paper } from '/@/shared/components/paper/paper';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';

export type KanjiPickerTarget = {
    binding: FuriganaBinding | null;
    charOffset: number;
    lineIndex: number;
    spanLength: number;
    suggestedReading: null | string;
    text: string;
    x: number;
    y: number;
};

interface KanjiPickerProps {
    onApplyToIdentical: () => void;
    onBind: (reading: string) => void;
    onClose: () => void;
    onToggleDisplay: () => void;
    onUnbind: () => void;
    target: KanjiPickerTarget;
}

const PANEL_WIDTH = 320;
const PANEL_MAX_HEIGHT = 420;
const PANEL_MARGIN = 12;

// Kun'yomi readings carry okurigana markers in KANJIDIC2: "た.べる" -> "た"
// (the okurigana is already in the lyric text), "-がた" -> "がた"
const kunReadingToBinding = (reading: string): string => reading.split('.')[0].replaceAll('-', '');

/**
 * Floating reading picker for a kanji span: analyzer suggestion, full
 * KANJIDIC2 on/kun readings and meanings, free-text reading, and binding
 * management (display toggle, unbind, apply-to-identical). Ported from the
 * Museeks reference (src/components/KanjiPicker.tsx), rebuilt with Mantine
 * wrappers. Keyed by the caller on `${lineIndex}-${charOffset}-${spanLength}`
 * so shift-click span extension remounts (and resets) this component.
 */
export const KanjiPicker = ({
    onApplyToIdentical,
    onBind,
    onClose,
    onToggleDisplay,
    onUnbind,
    target,
}: KanjiPickerProps) => {
    const { t } = useTranslation();
    const kanjiChars = useMemo(() => Array.from(target.text), [target.text]);
    const { data: kanjiInfo } = useKanjiInfo(kanjiChars);

    const [reading, setReading] = useState(
        target.binding?.reading ?? target.suggestedReading ?? '',
    );

    const left = Math.max(
        PANEL_MARGIN,
        Math.min(target.x, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN),
    );
    const top = Math.max(
        PANEL_MARGIN,
        Math.min(target.y + 10, window.innerHeight - PANEL_MAX_HEIGHT - PANEL_MARGIN),
    );

    const bind = () => {
        const trimmed = reading.trim();
        if (trimmed !== '') {
            onBind(trimmed);
        }
    };

    return (
        <>
            <div className={styles.backdrop} onClick={onClose} />
            <div
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        onClose();
                    }
                }}
                role="dialog"
            >
                <Paper className={styles.panel} p={0} style={{ left, top }} withBorder>
                    <Stack gap="sm" h="100%" p="md">
                        <Group align="baseline" gap="sm" wrap="wrap">
                            <Text className={styles.kanjiTitle}>{target.text}</Text>
                            {target.binding !== null && (
                                <Text c="primary" size="sm">
                                    {target.binding.reading}
                                </Text>
                            )}
                            {target.spanLength === 1 &&
                                kanjiInfo?.[target.text] != null &&
                                kanjiInfo[target.text].meanings.length > 0 && (
                                    <Text isMuted size="xs">
                                        {kanjiInfo[target.text].meanings.join(', ')}
                                    </Text>
                                )}
                        </Group>

                        <Group className={styles.bindRow} gap="xs" wrap="nowrap">
                            <TextInput
                                autoFocus
                                className={styles.readingInput}
                                onChange={(event) => setReading(event.currentTarget.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        bind();
                                    }
                                }}
                                placeholder={t('setting.furiganaBindingReadingPlaceholder')}
                                value={reading}
                            />
                            <Button disabled={reading.trim() === ''} onClick={bind} size="sm">
                                {target.binding !== null ? t('common.update') : t('common.bind')}
                            </Button>
                        </Group>

                        {target.suggestedReading !== null && (
                            <Stack className={styles.section} gap={4}>
                                <Text className={styles.sectionTitle}>
                                    {t('setting.furiganaSuggestedReading')}
                                </Text>
                                <Group className={styles.chips} gap={4}>
                                    <Badge
                                        className={styles.chip}
                                        onClick={() =>
                                            setReading(target.suggestedReading as string)
                                        }
                                        variant="outline"
                                    >
                                        {target.suggestedReading}
                                    </Badge>
                                </Group>
                            </Stack>
                        )}

                        <ScrollArea className={styles.scrollArea}>
                            <Stack gap="sm">
                                {kanjiChars.map((char) => {
                                    const info = kanjiInfo?.[char];
                                    if (info == null) {
                                        return null;
                                    }

                                    return (
                                        <Stack className={styles.section} gap={4} key={char}>
                                            {kanjiChars.length > 1 && (
                                                <Text fw={700} size="md">
                                                    {char}
                                                </Text>
                                            )}
                                            {info.on.length > 0 && (
                                                <>
                                                    <Text className={styles.sectionTitle}>
                                                        {t('setting.furiganaOnyomi')}
                                                    </Text>
                                                    <Group className={styles.chips} gap={4}>
                                                        {info.on.map((r) => (
                                                            <Badge
                                                                className={styles.chip}
                                                                key={r}
                                                                onClick={() =>
                                                                    setReading(kataToHira(r))
                                                                }
                                                                variant="default"
                                                            >
                                                                {r}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                </>
                                            )}
                                            {info.kun.length > 0 && (
                                                <>
                                                    <Text className={styles.sectionTitle}>
                                                        {t('setting.furiganaKunyomi')}
                                                    </Text>
                                                    <Group className={styles.chips} gap={4}>
                                                        {info.kun.map((r) => (
                                                            <Badge
                                                                className={styles.chip}
                                                                key={r}
                                                                onClick={() =>
                                                                    setReading(
                                                                        kunReadingToBinding(r),
                                                                    )
                                                                }
                                                                variant="default"
                                                            >
                                                                {r}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                </>
                                            )}
                                            {kanjiChars.length > 1 && info.meanings.length > 0 && (
                                                <Text isMuted size="xs">
                                                    {info.meanings.join(', ')}
                                                </Text>
                                            )}
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </ScrollArea>

                        {target.binding !== null && (
                            <Group className={styles.actions} gap="xs" wrap="wrap">
                                <Switch
                                    checked={target.binding.display}
                                    className={styles.displayToggle}
                                    label={t('setting.furiganaShowBinding')}
                                    onChange={onToggleDisplay}
                                    size="xs"
                                />
                                <Button
                                    onClick={onApplyToIdentical}
                                    size="sm"
                                    title={t('setting.furiganaApplyToIdenticalDescription')}
                                    variant="default"
                                >
                                    {t('setting.furiganaApplyToIdentical')}
                                </Button>
                                <Button color="red" onClick={onUnbind} size="sm" variant="default">
                                    {t('common.unbind')}
                                </Button>
                            </Group>
                        )}

                        <ActionIcon
                            icon="x"
                            onClick={onClose}
                            pos="absolute"
                            right={8}
                            size="sm"
                            top={8}
                            variant="subtle"
                        />
                    </Stack>
                </Paper>
            </div>
        </>
    );
};
