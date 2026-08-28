import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { kataToHira } from '../../../../main/features/core/lyrics/furigana';
import styles from './kanji-picker.module.css';

import { FuriganaBinding } from '/@/renderer/features/lyrics/api/furigana-render-model';
import { useKanjiInfo } from '/@/renderer/features/lyrics/hooks/use-kanji-info';
import { useLyricsSettings } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { Popover } from '/@/shared/components/popover/popover';
import { Portal } from '/@/shared/components/portal/portal';
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
    /** This viewer can time the lyrics (admin on Navidrome) rather than only being told they are untimed */
    canSyncLyrics: boolean;
    /** Whether the current lyrics carry timestamps, i.e. whether a card can have audio */
    lyricsAreTimed: boolean;
    onApplyToIdentical: () => void;
    onBind: (reading: string) => void;
    onClose: () => void;
    onSaveMusicCard: (reading: string) => void;
    onSyncLyrics: () => void;
    onToggleDisplay: () => void;
    onUnbind: () => void;
    savingMusicCard: boolean;
    target: KanjiPickerTarget;
}

const DEFAULT_PANEL_WIDTH = 340;
const DEFAULT_PANEL_OPACITY = 100;
const DEFAULT_PANEL_FONT_SIZE = 14;

// Marker attribute that lyric-conversion.ts puts on every clickable kanji run
// (see KANJI_SPAN_SELECTOR in lyric-line.tsx)
const KANJI_SPAN_SELECTOR = '[data-kanji-offset]';

// Kun'yomi readings carry okurigana markers in KANJIDIC2: "た.べる" -> "た"
// (the okurigana is already in the lyric text), "-がた" -> "がた"
const kunReadingToBinding = (reading: string): string => reading.split('.')[0].replaceAll('-', '');

const SectionLabel = ({ children }: { children: ReactNode }) => (
    <Text fw={600} isMuted style={{ fontSize: '0.7em', letterSpacing: '0.06em' }} tt="uppercase">
        {children}
    </Text>
);

/**
 * The popover dismisses on document `mousedown`, which would tear this picker
 * down before the kanji span's `click` handler runs, leaving the caller without
 * the open target that shift-click span extension merges against. Kanji spans
 * are re-entry points into the picker rather than "outside", so their pointer
 * press is kept away from the dismiss listener.
 */
const useKeepOpenOnKanjiSpanPress = () => {
    useEffect(() => {
        const stopSpanPress = (event: Event) => {
            const node = event.target as HTMLElement | null;

            if (node?.closest?.(KANJI_SPAN_SELECTOR)) {
                event.stopPropagation();
            }
        };

        document.addEventListener('mousedown', stopSpanPress, true);
        document.addEventListener('touchstart', stopSpanPress, true);

        return () => {
            document.removeEventListener('mousedown', stopSpanPress, true);
            document.removeEventListener('touchstart', stopSpanPress, true);
        };
    }, []);
};

/**
 * Floating reading picker for a kanji span: analyzer suggestion, full
 * KANJIDIC2 on/kun readings and meanings, free-text reading, and binding
 * management (display toggle, unbind, apply-to-identical). Ported from the
 * Museeks reference (src/components/KanjiPicker.tsx), rebuilt on the shared
 * Popover. Keyed by the caller on `${lineIndex}-${charOffset}-${spanLength}`
 * so shift-click span extension remounts (and resets) this component.
 */
export const KanjiPicker = ({
    canSyncLyrics,
    lyricsAreTimed,
    onApplyToIdentical,
    onBind,
    onClose,
    onSaveMusicCard,
    onSyncLyrics,
    onToggleDisplay,
    onUnbind,
    savingMusicCard,
    target,
}: KanjiPickerProps) => {
    const { t } = useTranslation();
    const kanjiChars = useMemo(() => Array.from(target.text), [target.text]);
    const { data: kanjiInfo } = useKanjiInfo(kanjiChars);
    const lyricsSettings = useLyricsSettings();

    const [reading, setReading] = useState(
        target.binding?.reading ?? target.suggestedReading ?? '',
    );
    const [timingPromptOpen, setTimingPromptOpen] = useState(false);

    useKeepOpenOnKanjiSpanPress();

    const panelWidth = lyricsSettings.kanjiPickerWidth ?? DEFAULT_PANEL_WIDTH;
    const panelOpacity = lyricsSettings.kanjiPickerOpacity ?? DEFAULT_PANEL_OPACITY;
    const panelFontSize = lyricsSettings.kanjiPickerFontSize ?? DEFAULT_PANEL_FONT_SIZE;
    const showMeanings = lyricsSettings.kanjiPickerShowMeanings ?? true;

    const bind = () => {
        const trimmed = reading.trim();
        if (trimmed !== '') {
            onBind(trimmed);
        }
    };

    // A music card is a replayable audio window anchored on a lyric line, so
    // untimed lyrics have nothing to cut. Rather than saving a card that can
    // never play, name the missing precondition and offer the way out.
    const saveMusicCard = () => {
        const trimmed = reading.trim();
        if (trimmed === '') return;

        if (!lyricsAreTimed) {
            setTimingPromptOpen(true);
            return;
        }

        onSaveMusicCard(trimmed);
    };

    return (
        // The whole popover is portalled because the anchor is position: fixed
        // at viewport click coordinates: rendered inline it would sit inside
        // the transformed synced-lyrics container, which turns fixed
        // positioning into ancestor-relative and strands the picker far from
        // the clicked kanji
        <Portal>
            <Popover
                // The anchor is a synthetic point rather than a real element, so it
                // can never scroll out of view and be detached from the dropdown
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
                        // Background alpha keeps text crisp at low opacity, unlike a
                        // full-element `opacity` which would also fade the text
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
                                {target.binding !== null && (
                                    <Text c="primary" style={{ fontSize: '0.95em' }}>
                                        {target.binding.reading}
                                    </Text>
                                )}
                                {showMeanings &&
                                    target.spanLength === 1 &&
                                    kanjiInfo?.[target.text] != null &&
                                    kanjiInfo[target.text].meanings.length > 0 && (
                                        <Text isMuted style={{ fontSize: '0.8em' }}>
                                            {kanjiInfo[target.text].meanings.join(', ')}
                                        </Text>
                                    )}
                            </Group>
                            <ActionIcon icon="x" onClick={onClose} size="sm" variant="subtle" />
                        </Group>

                        <Group gap="xs" wrap="nowrap">
                            <TextInput
                                className={styles.readingInput}
                                classNames={{ input: styles.readingField }}
                                data-autofocus
                                onChange={(event) => setReading(event.currentTarget.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        bind();
                                    }
                                }}
                                placeholder={t('setting.furiganaBindingReadingPlaceholder')}
                                value={reading}
                            />
                            <Button
                                classNames={{ root: styles.bindButton }}
                                disabled={reading.trim() === ''}
                                onClick={bind}
                                size="sm"
                            >
                                {target.binding !== null ? t('common.update') : t('common.bind')}
                            </Button>
                            <Button
                                classNames={{ root: styles.bindButton }}
                                disabled={reading.trim() === ''}
                                loading={savingMusicCard}
                                onClick={saveMusicCard}
                                size="sm"
                            >
                                {t('page.musicCards.save')}
                            </Button>
                        </Group>

                        {timingPromptOpen && !lyricsAreTimed && (
                            <Stack className={styles.timingPrompt} gap="xs">
                                <Text style={{ fontSize: '0.85em' }}>
                                    {canSyncLyrics
                                        ? t('page.musicCards.untimedLyricsCanTime')
                                        : t('page.musicCards.untimedLyrics')}
                                </Text>
                                <Group gap="xs" wrap="nowrap">
                                    {canSyncLyrics ? (
                                        <Button
                                            classNames={{ root: styles.bindButton }}
                                            onClick={onSyncLyrics}
                                            size="sm"
                                        >
                                            {t('lyricsEditor.syncTitle')}
                                        </Button>
                                    ) : (
                                        <Button
                                            classNames={{ root: styles.bindButton }}
                                            loading={savingMusicCard}
                                            onClick={() => onSaveMusicCard(reading.trim())}
                                            size="sm"
                                        >
                                            {t('page.musicCards.saveWithoutAudio')}
                                        </Button>
                                    )}
                                    <Button
                                        classNames={{ root: styles.bindButton }}
                                        onClick={() => setTimingPromptOpen(false)}
                                        size="sm"
                                        variant="default"
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                </Group>
                            </Stack>
                        )}

                        {target.suggestedReading !== null && (
                            <Stack gap={4}>
                                <SectionLabel>{t('setting.furiganaSuggestedReading')}</SectionLabel>
                                <Group gap={4}>
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

                        <ScrollArea className={styles.readings}>
                            <Stack gap="sm">
                                {kanjiChars.map((char) => {
                                    const info = kanjiInfo?.[char];
                                    if (info == null) {
                                        return null;
                                    }

                                    return (
                                        <Stack gap={4} key={char}>
                                            {kanjiChars.length > 1 && <Text fw={700}>{char}</Text>}
                                            {info.on.length > 0 && (
                                                <>
                                                    <SectionLabel>
                                                        {t('setting.furiganaOnyomi')}
                                                    </SectionLabel>
                                                    <Group gap={4}>
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
                                                    <SectionLabel>
                                                        {t('setting.furiganaKunyomi')}
                                                    </SectionLabel>
                                                    <Group gap={4}>
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
                                            {showMeanings &&
                                                kanjiChars.length > 1 &&
                                                info.meanings.length > 0 && (
                                                    <Text isMuted style={{ fontSize: '0.8em' }}>
                                                        {info.meanings.join(', ')}
                                                    </Text>
                                                )}
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </ScrollArea>

                        {target.binding !== null && (
                            <>
                                <Divider />
                                <Group gap="xs" justify="space-between" wrap="wrap">
                                    <Switch
                                        checked={target.binding.display}
                                        label={t('setting.furiganaShowBinding')}
                                        onChange={onToggleDisplay}
                                        size="xs"
                                    />
                                    <Group gap="xs" wrap="nowrap">
                                        <Button
                                            onClick={onApplyToIdentical}
                                            size="sm"
                                            title={t('setting.furiganaApplyToIdenticalDescription')}
                                            variant="default"
                                        >
                                            {t('setting.furiganaApplyToIdentical')}
                                        </Button>
                                        <Button
                                            color="red"
                                            onClick={onUnbind}
                                            size="sm"
                                            variant="default"
                                        >
                                            {t('common.unbind')}
                                        </Button>
                                    </Group>
                                </Group>
                            </>
                        )}
                    </Stack>
                </Popover.Dropdown>
            </Popover>
        </Portal>
    );
};
