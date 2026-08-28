import { useTranslation } from 'react-i18next';

import styles from './word-info-popover.module.css';

import { useWordInfo } from '/@/renderer/features/lyrics/hooks/use-word-info';
import { WordSpanClickDetail } from '/@/renderer/features/lyrics/lyric-line';
import { useLyricsSettings } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Group } from '/@/shared/components/group/group';
import { Popover } from '/@/shared/components/popover/popover';
import { Portal } from '/@/shared/components/portal/portal';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

export type WordInfoTarget = WordSpanClickDetail;

interface WordInfoPopoverProps {
    onClose: () => void;
    target: WordInfoTarget;
}

const DEFAULT_PANEL_WIDTH = 340;
const DEFAULT_PANEL_OPACITY = 100;
const DEFAULT_PANEL_FONT_SIZE = 14;

const MAX_DISPLAY_ENTRIES = 5;

/**
 * Floating JMdict entry card for a lyrics word token: reading, part-of-speech
 * codes, and glosses from the bundled compact JMdict asset, looked up by the
 * token's dictionary form (use-word-info). Built on the same portalled
 * synthetic-anchor Popover model as the KanjiPicker and shares its panel
 * width/opacity/font-size settings.
 */
export const WordInfoPopover = ({ onClose, target }: WordInfoPopoverProps) => {
    const { t } = useTranslation();
    const lyricsSettings = useLyricsSettings();

    const { data: entries, isLoading } = useWordInfo({
        basicForm: target.basicForm,
        pos: target.pos,
        reading: target.reading,
        surface: target.text,
    });

    const panelWidth = lyricsSettings.kanjiPickerWidth ?? DEFAULT_PANEL_WIDTH;
    const panelOpacity = lyricsSettings.kanjiPickerOpacity ?? DEFAULT_PANEL_OPACITY;
    const panelFontSize = lyricsSettings.kanjiPickerFontSize ?? DEFAULT_PANEL_FONT_SIZE;

    const showBaseForm = !!target.basicForm && target.basicForm !== target.text;

    return (
        // Portalled for the same reason as the KanjiPicker: the fixed-position
        // anchor must not sit inside the transformed synced-lyrics container
        <Portal>
            <Popover
                hideDetached={false}
                onDismiss={onClose}
                opened
                position="bottom-start"
                returnFocus
                trapFocus
                width={panelWidth}
            >
                <Popover.Target>
                    <div className={styles.anchor} style={{ left: target.x, top: target.y }} />
                </Popover.Target>
                <Popover.Dropdown
                    className={styles.dropdown}
                    style={{
                        backgroundColor: `color-mix(in srgb, var(--theme-colors-background) ${panelOpacity}%, transparent)`,
                        fontSize: `${panelFontSize}px`,
                    }}
                >
                    <Stack gap="sm">
                        <Group align="flex-start" gap="sm" justify="space-between" wrap="nowrap">
                            <Group align="baseline" gap="sm" wrap="wrap">
                                <Text fw={700} style={{ fontSize: '1.7em' }}>
                                    {target.text}
                                </Text>
                                {target.reading && target.reading !== target.text && (
                                    <Text c="primary" style={{ fontSize: '0.95em' }}>
                                        {target.reading}
                                    </Text>
                                )}
                                {showBaseForm && (
                                    <Text isMuted style={{ fontSize: '0.8em' }}>
                                        {t('setting.wordLookupBaseForm', {
                                            baseForm: target.basicForm,
                                        })}
                                    </Text>
                                )}
                            </Group>
                            <ActionIcon icon="x" onClick={onClose} size="sm" variant="subtle" />
                        </Group>

                        {isLoading ? (
                            <Spinner />
                        ) : entries?.length ? (
                            <ScrollArea className={styles.entries}>
                                <Stack gap="sm">
                                    {entries
                                        .slice(0, MAX_DISPLAY_ENTRIES)
                                        .map((entry, entryIdx) => (
                                            <Stack gap={4} key={entryIdx}>
                                                <Group align="baseline" gap="xs" wrap="wrap">
                                                    <Text fw={700}>
                                                        {entry.kanji ?? entry.reading}
                                                    </Text>
                                                    {entry.kanji !== null && (
                                                        <Text
                                                            isMuted
                                                            style={{ fontSize: '0.85em' }}
                                                        >
                                                            {entry.reading}
                                                        </Text>
                                                    )}
                                                </Group>
                                                {entry.senses.map((sense, senseIdx) => (
                                                    <Group
                                                        align="baseline"
                                                        gap="xs"
                                                        key={senseIdx}
                                                        wrap="wrap"
                                                    >
                                                        {sense.pos.map((code) => (
                                                            <Badge
                                                                className={styles.posChip}
                                                                key={code}
                                                                variant="default"
                                                            >
                                                                {code}
                                                            </Badge>
                                                        ))}
                                                        <Text style={{ fontSize: '0.9em' }}>
                                                            {sense.glosses.join('; ')}
                                                        </Text>
                                                    </Group>
                                                ))}
                                            </Stack>
                                        ))}
                                </Stack>
                            </ScrollArea>
                        ) : (
                            <Text isMuted style={{ fontSize: '0.9em' }}>
                                {t('setting.wordLookupNoEntry')}
                            </Text>
                        )}
                    </Stack>
                </Popover.Dropdown>
            </Popover>
        </Portal>
    );
};
