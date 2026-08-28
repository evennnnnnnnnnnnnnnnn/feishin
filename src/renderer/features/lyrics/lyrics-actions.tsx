import isElectron from 'is-electron';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './lyrics-actions.module.css';

import { openLyricSearchModal } from '/@/renderer/features/lyrics/components/lyrics-search-form';
import {
    useLyricsSettings,
    usePlaybackType,
    usePlayerActions,
    usePlayerSong,
    usePlayerSpeed,
} from '/@/renderer/store';
import {
    useLyricsPracticeActions,
    useLyricsPracticeLoop,
    useLyricsPracticeLoopDraft,
} from '/@/renderer/store/lyrics-practice.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Group } from '/@/shared/components/group/group';
import { AppIcon, Icon } from '/@/shared/components/icon/icon';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Popover } from '/@/shared/components/popover/popover';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { Text } from '/@/shared/components/text/text';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { LyricsKind, LyricsOverride } from '/@/shared/types/domain-types';
import { PlayerType } from '/@/shared/types/types';

export type OverlayLayerToggle = {
    key: string;
    kind: LyricsKind;
    label: string;
};

interface LyricsActionsProps {
    hasLyrics: boolean;
    index: number;
    languages: { label: string; value: string }[];
    offsetMs: number;
    onExportLyrics: () => void;
    onRemoveLyric: () => void;
    onSearchOverride: (params: LyricsOverride) => void;
    /** Absent when this viewer cannot write lyric timings (non-admin, or not Navidrome) */
    onSyncLyrics?: () => void;
    onToggleOverlayLayer?: (key: string) => void;
    onTranslateLyric?: () => void;
    onUpdateOffset: (offsetMs: number) => void;
    overlayLayers?: OverlayLayerToggle[];
    setIndex: (idx: number) => void;
    settingsKey?: string;
    synced?: boolean;
    visibleOverlayKeys?: Set<string>;
}

const OVERLAY_KIND_ICONS: Partial<Record<LyricsKind, keyof typeof AppIcon>> = {
    pronunciation: 'audioLines',
    translation: 'languages',
};

// Practice speeds only; the full 0.5-2 range lives in the player config
// slider (player.playbackSpeed). 1 doubles as the explicit reset.
const PRACTICE_SPEEDS = [0.5, 0.75, 0.9, 1];

const getOverlayTooltip = (
    layer: OverlayLayerToggle,
    t: (key: string) => string,
    isActive: boolean,
): string => {
    const action = isActive ? 'Hide' : 'Show';

    if (layer.kind === 'pronunciation') {
        return `${action} ${t('page.fullscreenPlayer.showPronunciation').toLowerCase()}`;
    }

    if (layer.kind === 'translation') {
        return `${action} ${t('page.fullscreenPlayer.showTranslation').toLowerCase()}`;
    }

    return `${action} ${layer.label}`;
};

export const LyricsActions = ({
    hasLyrics,
    index,
    languages,
    offsetMs,
    onExportLyrics,
    onRemoveLyric,
    onSearchOverride,
    onSyncLyrics,
    onToggleOverlayLayer,
    onTranslateLyric,
    onUpdateOffset,
    overlayLayers = [],
    setIndex,
    visibleOverlayKeys = new Set(),
}: LyricsActionsProps) => {
    const { t } = useTranslation();
    const currentSong = usePlayerSong();
    const { sources } = useLyricsSettings();
    const speed = usePlayerSpeed();
    const { setSpeed } = usePlayerActions();
    const playbackType = usePlaybackType();
    const practiceLoop = useLyricsPracticeLoop();
    const practiceLoopDraft = useLyricsPracticeLoopDraft();
    const { clearLoop } = useLyricsPracticeActions();

    const handleLyricOffset = (e: number | string) => {
        onUpdateOffset(Number(e));
    };

    const isActionsDisabled = !currentSong;
    const isDesktop = isElectron();
    const hasServerTranslationLayer = overlayLayers.some((layer) => layer.kind === 'translation');
    const hasMultipleLanguages = languages.length > 1;

    const selectedLanguage = useMemo(
        () => languages.find((language) => language.value === index.toString()),
        [index, languages],
    );

    const { extraOverlayLayers, quickOverlayLayers } = useMemo(() => {
        const quick: OverlayLayerToggle[] = [];
        const extra: OverlayLayerToggle[] = [];

        for (const layer of overlayLayers) {
            if (layer.kind === 'pronunciation' || layer.kind === 'translation') {
                quick.push(layer);
                continue;
            }

            extra.push(layer);
        }

        return {
            extraOverlayLayers: extra,
            quickOverlayLayers: quick,
        };
    }, [overlayLayers]);

    const hasActiveExtraOverlay = extraOverlayLayers.some((layer) =>
        visibleOverlayKeys.has(layer.key),
    );

    const languageTooltip = selectedLanguage
        ? `${t('page.fullscreenPlayer.lyricLanguage')}: ${selectedLanguage.label}`
        : t('page.fullscreenPlayer.lyricLanguage');

    const showTopRow =
        hasLyrics ||
        hasMultipleLanguages ||
        quickOverlayLayers.length > 0 ||
        extraOverlayLayers.length > 0;

    const languageMenu = hasMultipleLanguages ? (
        <DropdownMenu position="top">
            <DropdownMenu.Target>
                <ActionIcon
                    aria-label={languageTooltip}
                    disabled={isActionsDisabled}
                    icon="metadata"
                    iconProps={{ size: 'lg' }}
                    size="sm"
                    tooltip={{
                        label: languageTooltip,
                        openDelay: 0,
                    }}
                    variant="subtle"
                />
            </DropdownMenu.Target>
            <DropdownMenu.Dropdown>
                {languages.map((language) => (
                    <DropdownMenu.Item
                        isSelected={language.value === index.toString()}
                        key={language.value}
                        onClick={() => setIndex(parseInt(language.value, 10))}
                    >
                        {language.label}
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.Dropdown>
        </DropdownMenu>
    ) : null;

    const overlayToggleIcons = quickOverlayLayers.map((layer) => {
        const isActive = visibleOverlayKeys.has(layer.key);
        const icon = OVERLAY_KIND_ICONS[layer.kind] ?? 'list';

        return onToggleOverlayLayer ? (
            <ActionIcon
                aria-label={getOverlayTooltip(layer, t, isActive)}
                className={isActive ? styles.overlayToggleActive : undefined}
                disabled={isActionsDisabled}
                icon={icon}
                iconProps={isActive ? { color: 'primary', size: 'lg' } : { size: 'lg' }}
                key={layer.key}
                onClick={() => onToggleOverlayLayer(layer.key)}
                size="sm"
                tooltip={{
                    label: getOverlayTooltip(layer, t, isActive),
                    openDelay: 0,
                }}
                variant="subtle"
            />
        ) : null;
    });

    const extraLayersPopover =
        extraOverlayLayers.length > 0 && onToggleOverlayLayer ? (
            <Popover position="top" withArrow>
                <Popover.Target>
                    <ActionIcon
                        aria-label={t('page.fullscreenPlayer.lyricLayers')}
                        className={hasActiveExtraOverlay ? styles.overlayToggleActive : undefined}
                        disabled={isActionsDisabled}
                        icon="list"
                        iconProps={
                            hasActiveExtraOverlay
                                ? { color: 'primary', size: 'lg' }
                                : { size: 'lg' }
                        }
                        size="sm"
                        tooltip={{
                            label: t('page.fullscreenPlayer.lyricLayers'),
                            openDelay: 0,
                        }}
                        variant="subtle"
                    />
                </Popover.Target>
                <Popover.Dropdown maw={280} miw={220} onClick={(e) => e.stopPropagation()} p="sm">
                    <Stack gap="sm">
                        <Text fw={600} isNoSelect size="sm">
                            {t('page.fullscreenPlayer.lyricLayers')}
                        </Text>
                        {extraOverlayLayers.map((layer) => (
                            <div className={styles.layerRow} key={layer.key}>
                                <Text className={styles.layerLabel} isNoSelect size="sm">
                                    {layer.label}
                                </Text>
                                <Switch
                                    aria-label={layer.label}
                                    checked={visibleOverlayKeys.has(layer.key)}
                                    onChange={() => onToggleOverlayLayer(layer.key)}
                                />
                            </div>
                        ))}
                    </Stack>
                </Popover.Dropdown>
            </Popover>
        ) : null;

    const isPracticeSpeedActive = speed !== 1;
    // Jukebox playback never consumes player.speed; showing the control there
    // would silently do nothing
    const practiceSpeedMenu =
        playbackType === PlayerType.JUKEBOX ? null : (
            <DropdownMenu position="top">
                <DropdownMenu.Target>
                    <ActionIcon
                        aria-label={t('page.fullscreenPlayer.practiceSpeed')}
                        className={isPracticeSpeedActive ? styles.overlayToggleActive : undefined}
                        disabled={isActionsDisabled}
                        icon="mediaSpeed"
                        iconProps={
                            isPracticeSpeedActive
                                ? { color: 'primary', size: 'lg' }
                                : { size: 'lg' }
                        }
                        size="sm"
                        tooltip={{
                            label: `${t('page.fullscreenPlayer.practiceSpeed')}: ${speed}x`,
                            openDelay: 0,
                        }}
                        variant="subtle"
                    />
                </DropdownMenu.Target>
                <DropdownMenu.Dropdown>
                    {PRACTICE_SPEEDS.map((value) => (
                        <DropdownMenu.Item
                            isSelected={speed === value}
                            key={value}
                            onClick={() => setSpeed(value)}
                        >
                            {`${value}x`}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Dropdown>
            </DropdownMenu>
        );

    const hasPracticeLoop = !!practiceLoop || !!practiceLoopDraft;
    const practiceLoopChip = hasPracticeLoop ? (
        <Button
            leftSection={<Icon icon="remove" />}
            onClick={clearLoop}
            size="compact-sm"
            tooltip={{ label: t('page.fullscreenPlayer.practiceLoopClear'), openDelay: 0 }}
            uppercase
            variant="subtle"
        >
            {practiceLoop ? 'A-B' : 'A-?'}
        </Button>
    ) : null;

    return (
        <div className={styles.root}>
            {showTopRow ? (
                <Group className={styles.topRow} gap="xs" justify="center">
                    {hasLyrics ? (
                        <Button
                            onClick={onExportLyrics}
                            size="compact-sm"
                            uppercase
                            variant="subtle"
                        >
                            {t('form.lyricsExport.export')}
                        </Button>
                    ) : null}
                    {languageMenu}
                    {overlayToggleIcons}
                    {extraLayersPopover}
                </Group>
            ) : null}
            <Group className={styles.controlsRow} gap="xs" justify="center">
                {practiceLoopChip}
                {practiceSpeedMenu}
                {isDesktop && sources.length ? (
                    <Button
                        disabled={isActionsDisabled}
                        onClick={() =>
                            openLyricSearchModal({
                                artist: currentSong?.artistName,
                                name: currentSong?.name,
                                onSearchOverride,
                            })
                        }
                        uppercase
                        variant="subtle"
                    >
                        {t('common.search')}
                    </Button>
                ) : null}
                <ActionIcon
                    aria-label="Decrease lyric offset"
                    disabled={isActionsDisabled}
                    icon="minus"
                    onClick={() => handleLyricOffset(offsetMs - 50)}
                    tooltip={{
                        label: t('common.slower'),
                        openDelay: 0,
                    }}
                    variant="subtle"
                />
                <Tooltip label={t('setting.lyricOffset')} openDelay={0}>
                    <NumberInput
                        aria-label="Lyric offset"
                        disabled={isActionsDisabled}
                        onChange={handleLyricOffset}
                        styles={{ input: { textAlign: 'center' } }}
                        value={offsetMs || 0}
                        width={70}
                    />
                </Tooltip>
                <ActionIcon
                    aria-label="Increase lyric offset"
                    disabled={isActionsDisabled}
                    icon="plus"
                    onClick={() => handleLyricOffset(offsetMs + 50)}
                    tooltip={{
                        label: t('common.faster'),
                        openDelay: 0,
                    }}
                    variant="subtle"
                />
                {onSyncLyrics && hasLyrics ? (
                    <ActionIcon
                        aria-label={t('lyricsEditor.syncTitle')}
                        disabled={isActionsDisabled}
                        icon="duration"
                        onClick={onSyncLyrics}
                        tooltip={{
                            label: t('lyricsEditor.syncTitle'),
                            openDelay: 0,
                        }}
                        variant="subtle"
                    />
                ) : null}
                {isDesktop && sources.length ? (
                    <Button
                        disabled={isActionsDisabled}
                        onClick={onRemoveLyric}
                        uppercase
                        variant="subtle"
                    >
                        {hasLyrics ? t('common.clear') : t('common.refresh')}
                    </Button>
                ) : null}
                {isDesktop && sources.length && onTranslateLyric && !hasServerTranslationLayer ? (
                    <Button
                        disabled={isActionsDisabled}
                        onClick={onTranslateLyric}
                        uppercase
                        variant="subtle"
                    >
                        {t('common.translation')}
                    </Button>
                ) : null}
            </Group>
        </div>
    );
};
