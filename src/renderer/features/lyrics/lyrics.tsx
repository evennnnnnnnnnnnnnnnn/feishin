import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import styles from './lyrics.module.css';

import * as lyricsApi from '/@/lyrics-conversion-api';
import { queryKeys } from '/@/renderer/api/query-keys';
import {
    FuriganaBinding,
    getSpanSuggestedReading,
} from '/@/renderer/features/lyrics/api/furigana-render-model';
import { translateLyrics } from '/@/renderer/features/lyrics/api/lyric-translate';
import {
    computeSelectedFromResult,
    getDisplayOffset,
    lyricsQueries,
    type LyricsQueryResult,
} from '/@/renderer/features/lyrics/api/lyrics-api';
import {
    buildLyricsOverridePayload,
    useSaveLyricsOverrideMutation,
} from '/@/renderer/features/lyrics/api/lyrics-override-api';
import {
    formatStructuredLyricLabel,
    getLyricLineText,
    getLyricsLayers,
    getOverlayLayerKey,
    lyricsHasWordCues,
} from '/@/renderer/features/lyrics/api/lyrics-utils';
import {
    KanjiPicker,
    KanjiPickerTarget,
} from '/@/renderer/features/lyrics/components/kanji-picker';
import { openLyricsExportModal } from '/@/renderer/features/lyrics/components/lyrics-export-form';
import {
    WordInfoPopover,
    WordInfoTarget,
} from '/@/renderer/features/lyrics/components/word-info-popover';
import {
    useDeleteFuriganaBindingMutation,
    useFuriganaBindings,
    useUpsertFuriganaBindingMutation,
} from '/@/renderer/features/lyrics/hooks/use-furigana-bindings';
import {
    useFuriganaLyrics,
    useRomajiLyrics,
    useSyncedRomajiLyrics,
} from '/@/renderer/features/lyrics/hooks/use-furigana-lyrics';
import { KanjiSpanClickDetail, WordSpanClickDetail } from '/@/renderer/features/lyrics/lyric-line';
import { LyricsActions } from '/@/renderer/features/lyrics/lyrics-actions';
import { SynchronizedKaraokeLyrics } from '/@/renderer/features/lyrics/synchronized-karaoke-lyrics';
import {
    SynchronizedLyrics,
    SynchronizedLyricsProps,
} from '/@/renderer/features/lyrics/synchronized-lyrics';
import {
    UnsynchronizedLyrics,
    UnsynchronizedLyricsProps,
} from '/@/renderer/features/lyrics/unsynchronized-lyrics';
import { openLyricsSettingsModal } from '/@/renderer/features/lyrics/utils/open-lyrics-settings-modal';
import { deriveMusicCardSnippetWindow } from '/@/renderer/features/music-cards/api/music-card-snippet-window';
import { useSaveMusicCard } from '/@/renderer/features/music-cards/hooks/use-save-music-card';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { useIsRadioActive } from '/@/renderer/features/radio/hooks/use-radio-player';
import { ComponentErrorBoundary } from '/@/renderer/features/shared/components/component-error-boundary';
import { queryClient } from '/@/renderer/lib/react-query';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer, useLyricsSettings, usePlayerSong } from '/@/renderer/store';
import { useIsAdmin } from '/@/renderer/store/auth.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
import { LyricsOverride, ServerType } from '/@/shared/types/domain-types';

type LyricsProps = {
    fadeOutNoLyricsMessage?: boolean;
    settingsKey?: string;
};

export const Lyrics = ({ fadeOutNoLyricsMessage = true, settingsKey = 'default' }: LyricsProps) => {
    const currentSong = usePlayerSong();
    const isRadioActive = useIsRadioActive();
    const saveMusicCard = useSaveMusicCard();

    const isLyricsDisabled = isRadioActive;

    const {
        enableAutoTranslation,
        enableFurigana,
        enableRomaji,
        enableWordLookup,
        furiganaBindingsVisible,
        preferLocalLyrics,
        translationApiKey,
        translationApiProvider,
        translationTargetLanguage,
    } = useLyricsSettings();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentServerType = useCurrentServer()?.type;
    const [index, setIndexState] = useState(0);
    const [translatedLyrics, setTranslatedLyrics] = useState<null | string>(null);
    const [showTranslation, setShowTranslation] = useState(false);
    const [visibleOverlayLayerKeys, setVisibleOverlayLayerKeys] = useLocalStorage<string[]>({
        defaultValue: [],
        key: `lyrics:visible-overlay-layers:${settingsKey}`,
    });
    const [pendingSongId, setPendingSongId] = useState<string | undefined>(currentSong?.id);
    const lyricsFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const previousSongIdRef = useRef<string | undefined>(currentSong?.id);

    useEffect(() => {
        const currentSongId = currentSong?.id;
        const previousSongId = previousSongIdRef.current;

        if (currentSongId === previousSongId) {
            return;
        }

        previousSongIdRef.current = currentSongId;
        setPendingSongId(undefined);

        if (!currentSongId) {
            return;
        }

        clearTimeout(lyricsFetchTimeoutRef.current);
        lyricsFetchTimeoutRef.current = setTimeout(() => {
            setPendingSongId(currentSongId);
        }, 500);

        return () => {
            clearTimeout(lyricsFetchTimeoutRef.current);
        };
    }, [currentSong?.id]);

    const lyricsKey = useMemo(() => {
        if (!currentSong?._serverId || !currentSong?.id) return null;
        return queryKeys.songs.lyrics(currentSong._serverId, { songId: currentSong.id });
    }, [currentSong]);

    const shouldFetchLyrics = !isLyricsDisabled && !!currentSong?._serverId && !!currentSong?.id;
    const isWaitingToFetchLyrics = shouldFetchLyrics && pendingSongId !== currentSong?.id;

    const { data, isLoading, isRefetching } = useQuery(
        lyricsQueries.songLyrics(
            {
                options: {
                    enabled:
                        !!pendingSongId && pendingSongId === currentSong?.id && !isLyricsDisabled,
                },
                query: { songId: currentSong?.id || '' },
                serverId: currentSong?._serverId || '',
            },
            currentSong,
        ),
    );

    const indexToUse = data?.selectedStructuredIndex ?? index;
    useEffect(() => {
        if (data != null) setIndexState(data.selectedStructuredIndex);
    }, [data]);

    const { selected: lyrics, selectedSynced: synced } = useMemo(() => {
        if (!data) return { selected: null, selectedSynced: false };
        return computeSelectedFromResult(data, preferLocalLyrics, indexToUse);
    }, [data, indexToUse, preferLocalLyrics]);

    const { data: furiganaBindings } = useFuriganaBindings(
        currentSong?._serverId,
        currentServerType,
        currentSong?.id,
    );
    const upsertFuriganaBinding = useUpsertFuriganaBindingMutation(
        currentSong?._serverId,
        currentSong?.id,
    );
    const deleteFuriganaBinding = useDeleteFuriganaBindingMutation(
        currentSong?._serverId,
        currentSong?.id,
    );

    const { data: furiganaConvertedLyrics } = useFuriganaLyrics(
        lyrics?.lyrics,
        !!enableFurigana,
        furiganaBindings,
        furiganaBindingsVisible ?? true,
        !!enableWordLookup,
    );
    const { data: romajiConvertedLyrics, isFetching: isFetchingRomaji } = useRomajiLyrics(
        lyrics?.lyrics,
        !!enableRomaji,
    );

    const rawSyncedLyrics = useMemo(() => {
        if (!synced || !lyrics || !('lyrics' in lyrics) || !Array.isArray(lyrics.lyrics)) {
            return null;
        }

        return lyrics.lyrics;
    }, [lyrics, synced]);

    // The unconverted plain lyrics of an unsynchronized song. Deliberately read
    // off `lyrics` rather than `displayLyrics`: binding coordinates and card
    // text must be the source text, never the furigana/word-span HTML.
    const rawPlainLyrics = useMemo(() => {
        if (synced || !lyrics || !('lyrics' in lyrics) || typeof lyrics.lyrics !== 'string') {
            return null;
        }

        return lyrics.lyrics;
    }, [lyrics, synced]);

    // One line-text source for both views, so every kanji/binding handler below
    // works the same whether the lyrics carry timings or not. Line index means
    // the same thing on both sides: UnsynchronizedLyrics splits on '\n' and the
    // synced view indexes its line array.
    const lyricLineTexts = useMemo<null | string[]>(() => {
        if (rawSyncedLyrics) {
            return rawSyncedLyrics.map(getLyricLineText);
        }

        if (rawPlainLyrics !== null) {
            return rawPlainLyrics.split('\n');
        }

        return null;
    }, [rawPlainLyrics, rawSyncedLyrics]);

    // A music card is a replayable audio window anchored on a line, so it needs
    // timings. Unsynchronized lyrics carry none.
    const lyricsAreTimed = !!rawSyncedLyrics;

    const isNavidromeServer = currentServerType === ServerType.NAVIDROME;
    const { isAdmin } = useIsAdmin();
    const saveLyricsOverride = useSaveLyricsOverrideMutation();
    const canAddTimings = isAdmin && isNavidromeServer && !lyricsAreTimed && !!lyricLineTexts;

    const [pickerTarget, setPickerTarget] = useState<KanjiPickerTarget | null>(null);
    const [wordTarget, setWordTarget] = useState<null | WordInfoTarget>(null);

    const findFuriganaBinding = useCallback(
        (lineIndex: number, charOffset: number): FuriganaBinding | null =>
            furiganaBindings?.find(
                (binding) => binding.line_index === lineIndex && binding.char_offset === charOffset,
            ) ?? null,
        [furiganaBindings],
    );

    const handleWordClick = useCallback((detail: WordSpanClickDetail) => {
        setPickerTarget(null);
        setWordTarget(detail);
    }, []);

    const handleCloseWordInfo = useCallback(() => setWordTarget(null), []);

    const handleKanjiClick = useCallback(
        (detail: KanjiSpanClickDetail) => {
            if (!isNavidromeServer) return;

            setWordTarget(null);

            // Shift-click while a picker is open on the same line extends the
            // open span to cover both kanji runs (Museeks span-extension model)
            if (detail.shiftKey && pickerTarget && pickerTarget.lineIndex === detail.lineIndex) {
                const mergedOffset = Math.min(pickerTarget.charOffset, detail.charOffset);
                const mergedEnd = Math.max(
                    pickerTarget.charOffset + pickerTarget.spanLength,
                    detail.charOffset + detail.spanLength,
                );
                const mergedSpanLength = mergedEnd - mergedOffset;
                const lineText = lyricLineTexts?.[detail.lineIndex] ?? null;

                if (!lineText) return;

                const mergedText = Array.from(lineText).slice(mergedOffset, mergedEnd).join('');

                lyricsApi.analyzeLyricsLines([lineText]).then(([tokens = []]) => {
                    setPickerTarget({
                        binding: findFuriganaBinding(detail.lineIndex, mergedOffset),
                        charOffset: mergedOffset,
                        lineIndex: detail.lineIndex,
                        spanLength: mergedSpanLength,
                        suggestedReading: getSpanSuggestedReading(
                            tokens,
                            mergedOffset,
                            mergedSpanLength,
                        ),
                        text: mergedText,
                        x: detail.x,
                        y: detail.y,
                    });
                });
                return;
            }

            setPickerTarget({
                binding: findFuriganaBinding(detail.lineIndex, detail.charOffset),
                charOffset: detail.charOffset,
                lineIndex: detail.lineIndex,
                spanLength: detail.spanLength,
                suggestedReading: detail.suggestedReading,
                text: detail.text,
                x: detail.x,
                y: detail.y,
            });
        },
        [findFuriganaBinding, isNavidromeServer, lyricLineTexts, pickerTarget],
    );

    const handleClosePicker = useCallback(() => setPickerTarget(null), []);

    const handleBindFurigana = useCallback(
        (reading: string) => {
            if (!pickerTarget) return;

            upsertFuriganaBinding.mutate(
                {
                    charOffset: pickerTarget.charOffset,
                    display: pickerTarget.binding?.display ?? true,
                    kanjiText: pickerTarget.text,
                    lineIndex: pickerTarget.lineIndex,
                    reading,
                    spanLength: pickerTarget.spanLength,
                },
                {
                    onSuccess: (saved) =>
                        setPickerTarget((prev) =>
                            prev ? { ...prev, binding: saved ?? null } : prev,
                        ),
                },
            );
        },
        [pickerTarget, upsertFuriganaBinding],
    );

    const handleUnbindFurigana = useCallback(() => {
        if (!pickerTarget?.binding) return;

        deleteFuriganaBinding.mutate(
            {
                charOffset: pickerTarget.charOffset,
                id: pickerTarget.binding.id,
                lineIndex: pickerTarget.lineIndex,
            },
            { onSuccess: () => setPickerTarget(null) },
        );
    }, [deleteFuriganaBinding, pickerTarget]);

    const handleToggleFuriganaDisplay = useCallback(() => {
        if (!pickerTarget?.binding) return;

        upsertFuriganaBinding.mutate(
            {
                charOffset: pickerTarget.charOffset,
                display: !pickerTarget.binding.display,
                kanjiText: pickerTarget.text,
                lineIndex: pickerTarget.lineIndex,
                reading: pickerTarget.binding.reading,
                spanLength: pickerTarget.spanLength,
            },
            {
                onSuccess: (saved) =>
                    setPickerTarget((prev) => (prev ? { ...prev, binding: saved ?? null } : prev)),
            },
        );
    }, [pickerTarget, upsertFuriganaBinding]);

    const handleApplyFuriganaToIdentical = useCallback(() => {
        if (!pickerTarget?.binding || !lyricLineTexts) return;

        const { display, reading } = pickerTarget.binding;
        const targetChars = Array.from(pickerTarget.text);

        lyricLineTexts.forEach((lineText, lineIndex) => {
            const chars = Array.from(lineText);

            for (let offset = 0; offset <= chars.length - targetChars.length; offset += 1) {
                const isMatch = targetChars.every((char, i) => chars[offset + i] === char);
                if (!isMatch) continue;

                upsertFuriganaBinding.mutate({
                    charOffset: offset,
                    display,
                    kanjiText: pickerTarget.text,
                    lineIndex,
                    reading,
                    spanLength: targetChars.length,
                });
            }
        });
    }, [lyricLineTexts, pickerTarget, upsertFuriganaBinding]);

    const handleSaveMusicCard = useCallback(
        (reading: string) => {
            if (!currentSong || !pickerTarget || !lyricLineTexts) return;

            // Untimed lyrics carry no window to cut a clip from, so the card is
            // saved text-only: a zero window, which useSaveMusicCard reads as
            // "no clip to fetch" and the deck reads as "no replay to offer".
            const snippet = rawSyncedLyrics
                ? deriveMusicCardSnippetWindow(
                      rawSyncedLyrics,
                      pickerTarget.lineIndex,
                      // Song.duration is already in milliseconds
                      currentSong.duration,
                  )
                : {
                      endMs: 0,
                      snippetText: lyricLineTexts[pickerTarget.lineIndex] ?? '',
                      startMs: 0,
                  };

            if (!snippet) {
                toast.error({ message: t('page.musicCards.saveError') });
                return;
            }

            saveMusicCard.mutate(
                {
                    charOffset: pickerTarget.charOffset,
                    endMs: snippet.endMs,
                    fullLyrics: lyricLineTexts.join('\n'),
                    kanjiText: pickerTarget.text,
                    lineIndex: pickerTarget.lineIndex,
                    mediaFileId: currentSong.id,
                    reading,
                    snippetText: snippet.snippetText,
                    songArtist: currentSong.artistName,
                    songTitle: currentSong.name,
                    spanLength: pickerTarget.spanLength,
                    startMs: snippet.startMs,
                },
                {
                    onError: () => toast.error({ message: t('page.musicCards.saveError') }),
                    onSuccess: () => {
                        toast.success({ message: t('page.musicCards.saved') });
                        setPickerTarget(null);
                    },
                },
            );
        },
        [currentSong, lyricLineTexts, pickerTarget, rawSyncedLyrics, saveMusicCard, t],
    );

    /**
     * Seed a synced lyrics override from the plain lines so the existing
     * per-line time editor (EditableLyricLine/LyricTimeEditor, admin +
     * Navidrome only) applies to this song. Starts are spread evenly across
     * the track rather than zeroed: the editor is a nudging tool, so a rough
     * monotonic starting point is more useful than every line at 0.
     */
    const handleAddTimings = useCallback(() => {
        if (!currentSong?._serverId || !currentSong?.id || !lyricLineTexts?.length) return;

        // Song.duration is already in milliseconds
        const durationMs =
            currentSong.duration > 0 ? currentSong.duration : lyricLineTexts.length * 1000;
        const step = durationMs / lyricLineTexts.length;

        saveLyricsOverride.mutate(
            {
                payload: buildLyricsOverridePayload(
                    { artist: currentSong.artistName, name: currentSong.name },
                    lyricLineTexts.map((text, lineIndex) => ({
                        startMs: Math.round(lineIndex * step),
                        text,
                    })),
                ),
                serverId: currentSong._serverId,
                songId: currentSong.id,
            },
            { onSuccess: () => setPickerTarget(null) },
        );
    }, [currentSong, lyricLineTexts, saveLyricsOverride]);

    const displayLyrics = useMemo(() => {
        if (isLyricsDisabled || !lyrics) return null;
        if ((enableFurigana || enableWordLookup) && furiganaConvertedLyrics) {
            return { ...lyrics, lyrics: furiganaConvertedLyrics };
        }
        return lyrics;
    }, [enableFurigana, enableWordLookup, isLyricsDisabled, lyrics, furiganaConvertedLyrics]);

    const currentOffsetMs = useMemo(() => {
        if (!data) return 0;
        return getDisplayOffset(lyrics, data.selectedOffsetMs, indexToUse, data.local);
    }, [data, indexToUse, lyrics]);

    const layers = useMemo(() => {
        if (!Array.isArray(data?.local)) {
            return null;
        }

        return getLyricsLayers(data.local);
    }, [data]);

    const overlayLayerToggles = useMemo(() => {
        if (!layers?.overlayLayers.length) {
            return [];
        }

        return layers.overlayLayers.map((layer) => ({
            key: getOverlayLayerKey(layer),
            kind: layer.synced ? (layer.kind ?? 'main') : 'main',
            label: formatStructuredLyricLabel(layer),
        }));
    }, [layers]);

    const visibleOverlayKeys = useMemo(
        () => new Set(visibleOverlayLayerKeys),
        [visibleOverlayLayerKeys],
    );

    const visibleOverlayLayers = useMemo(() => {
        if (!layers?.overlayLayers.length || !visibleOverlayKeys.size) {
            return [];
        }

        return layers.overlayLayers.filter((layer) =>
            visibleOverlayKeys.has(getOverlayLayerKey(layer)),
        );
    }, [layers, visibleOverlayKeys]);

    const pronunciationLyricsOverlay = useMemo(() => {
        const layer = visibleOverlayLayers.find(
            (entry) => entry.synced && entry.kind === 'pronunciation',
        );

        return layer?.synced ? layer.lyrics : null;
    }, [visibleOverlayLayers]);

    const translationLyricsOverlay = useMemo(() => {
        const layer = visibleOverlayLayers.find(
            (entry) => entry.synced && entry.kind === 'translation',
        );

        return layer?.synced ? layer.lyrics : null;
    }, [visibleOverlayLayers]);

    const extraOverlayLyrics = useMemo(() => {
        return visibleOverlayLayers
            .filter(
                (entry) =>
                    entry.synced && entry.kind !== 'pronunciation' && entry.kind !== 'translation',
            )
            .map((entry) => (entry.synced ? entry.lyrics : null))
            .filter((entry): entry is NonNullable<typeof entry> => entry != null);
    }, [visibleOverlayLayers]);

    const selectedAgents = useMemo(() => {
        if (!lyrics || !('synced' in lyrics) || !lyrics.synced) {
            return undefined;
        }

        return lyrics.agents;
    }, [lyrics]);

    const displayOffsetMs = isLyricsDisabled ? 0 : currentOffsetMs;
    const useServerPronunciation = !!pronunciationLyricsOverlay;

    const shouldGenerateSyncedRomaji =
        !!enableRomaji &&
        !!rawSyncedLyrics &&
        lyricsHasWordCues(rawSyncedLyrics) &&
        !useServerPronunciation;

    const { data: syncedRomajiLyrics, isFetching: isFetchingSyncedRomaji } = useSyncedRomajiLyrics(
        rawSyncedLyrics,
        shouldGenerateSyncedRomaji,
    );

    const isKaraoke = useMemo(() => {
        if (!synced || !displayLyrics || !('lyrics' in displayLyrics)) {
            return false;
        }

        return Array.isArray(displayLyrics.lyrics) && lyricsHasWordCues(displayLyrics.lyrics);
    }, [displayLyrics, synced]);

    const syncedLyricsProps = useMemo(() => {
        if (!displayLyrics) {
            return null;
        }

        return {
            ...(displayLyrics as SynchronizedLyricsProps),
            extraOverlayLyrics: isKaraoke ? extraOverlayLyrics : undefined,
            offsetMs: displayOffsetMs,
            // Only installed where it can act (Navidrome binding API); when
            // absent, kanji clicks fall through to the enclosing word span
            // (JMdict lookup) or the line's click-to-seek
            onKanjiClick: enableFurigana && isNavidromeServer ? handleKanjiClick : undefined,
            onWordClick: enableWordLookup ? handleWordClick : undefined,
            pronunciationLyrics: pronunciationLyricsOverlay,
            rawLyrics: rawSyncedLyrics ?? undefined,
            romajiLyrics:
                enableRomaji && !useServerPronunciation && !shouldGenerateSyncedRomaji
                    ? (romajiConvertedLyrics as SynchronizedLyricsProps['romajiLyrics'])
                    : null,
            settingsKey,
            syncedRomajiLyrics: shouldGenerateSyncedRomaji ? (syncedRomajiLyrics ?? null) : null,
            translatedLyrics:
                showTranslation && !translationLyricsOverlay ? translatedLyrics : null,
            translationLyrics: translationLyricsOverlay,
        };
    }, [
        displayLyrics,
        displayOffsetMs,
        enableFurigana,
        enableRomaji,
        enableWordLookup,
        extraOverlayLyrics,
        handleKanjiClick,
        handleWordClick,
        isKaraoke,
        isNavidromeServer,
        pronunciationLyricsOverlay,
        rawSyncedLyrics,
        romajiConvertedLyrics,
        shouldGenerateSyncedRomaji,
        syncedRomajiLyrics,
        settingsKey,
        showTranslation,
        translatedLyrics,
        translationLyricsOverlay,
        useServerPronunciation,
    ]);

    const handleOnSearchOverride = useCallback(
        (params: LyricsOverride) => {
            if (!lyricsKey) return;
            queryClient.setQueryData<LyricsQueryResult>(lyricsKey, (prev) =>
                prev ? { ...prev, overrideSelection: params } : prev,
            );
            queryClient.invalidateQueries({ queryKey: lyricsKey });
        },
        [lyricsKey],
    );

    const handleUpdateOffset = useCallback(
        (offsetMs: number) => {
            if (!currentSong || !lyricsKey) return;

            queryClient.setQueryData<LyricsQueryResult>(lyricsKey, (prev) => {
                if (!prev) return prev;
                const updated = { ...prev, selectedOffsetMs: offsetMs };
                if (Array.isArray(prev.local) && prev.local.length > 0) {
                    const idx = Math.min(indexToUse, prev.local.length - 1);
                    updated.local = [...prev.local];
                    updated.local[idx] = {
                        ...updated.local[idx],
                        offsetMs,
                    };
                }
                return updated;
            });
        },
        [currentSong, indexToUse, lyricsKey],
    );

    const setIndex = useCallback(
        (newIndex: number) => {
            setIndexState(newIndex);
            if (!lyricsKey || !data) return;
            const { selected: nextSelected, selectedSynced: nextSynced } =
                computeSelectedFromResult(data, preferLocalLyrics, newIndex);
            const nextOffset = getDisplayOffset(
                nextSelected,
                data.selectedOffsetMs,
                newIndex,
                data.local,
            );
            queryClient.setQueryData<LyricsQueryResult>(lyricsKey, (prev) =>
                prev
                    ? {
                          ...prev,
                          selected: nextSelected,
                          selectedOffsetMs: nextOffset,
                          selectedStructuredIndex: newIndex,
                          selectedSynced: nextSynced,
                      }
                    : prev,
            );
        },
        [data, lyricsKey, preferLocalLyrics],
    );

    const handleOnRemoveLyric = useCallback(async () => {
        if (!currentSong || !lyricsKey) return;

        queryClient.setQueryData<LyricsQueryResult>(lyricsKey, (prev) =>
            prev
                ? {
                      ...prev,
                      overrideData: null,
                      overrideSelection: null,
                      remoteAuto: null,
                      suppressRemoteAuto: true,
                  }
                : prev,
        );
        await queryClient.invalidateQueries({ queryKey: lyricsKey });
    }, [currentSong, lyricsKey]);

    const fetchTranslation = useCallback(async () => {
        if (!lyrics || isLyricsDisabled) return;
        const originalLyrics = Array.isArray(lyrics.lyrics)
            ? lyrics.lyrics.map((line) => getLyricLineText(line)).join('\n')
            : lyrics.lyrics;
        const TranslatedText: null | string = await translateLyrics(
            originalLyrics,
            translationApiKey,
            translationApiProvider,
            translationTargetLanguage,
        );
        setTranslatedLyrics(TranslatedText);
        setShowTranslation(true);
    }, [
        isLyricsDisabled,
        lyrics,
        translationApiKey,
        translationApiProvider,
        translationTargetLanguage,
    ]);

    const handleOnTranslateLyric = useCallback(async () => {
        if (translatedLyrics) {
            setShowTranslation(!showTranslation);
            return;
        }
        await fetchTranslation();
    }, [translatedLyrics, showTranslation, fetchTranslation]);

    const handleToggleOverlayLayer = useCallback(
        (key: string) => {
            setVisibleOverlayLayerKeys((current) => {
                const next = new Set(current);
                if (next.has(key)) {
                    next.delete(key);
                } else {
                    next.add(key);
                }
                return Array.from(next);
            });
        },
        [setVisibleOverlayLayerKeys],
    );

    usePlayerEvents(
        {
            onCurrentSongChange: () => {
                setIndexState(0);
                setShowTranslation(false);
                setTranslatedLyrics(null);
            },
        },
        [],
    );

    useEffect(() => {
        if (displayLyrics && !translatedLyrics && enableAutoTranslation) {
            fetchTranslation();
        }
    }, [displayLyrics, translatedLyrics, enableAutoTranslation, fetchTranslation]);

    const languages = useMemo(() => {
        const local = data?.local;
        if (Array.isArray(local)) {
            return local.map((lyric, idx) => ({
                label: formatStructuredLyricLabel(lyric),
                value: idx.toString(),
            }));
        }
        if (local && !Array.isArray(local) && 'lyrics' in local) {
            return [{ label: 'xxx', value: '0' }];
        }
        return [];
    }, [data?.local]);

    const isWaitingForRomaji =
        !!enableRomaji &&
        !!lyrics &&
        (isFetchingRomaji || (shouldGenerateSyncedRomaji && isFetchingSyncedRomaji));

    const isLoadingLyrics =
        shouldFetchLyrics &&
        (isWaitingToFetchLyrics || isLoading || isRefetching || isWaitingForRomaji);
    const hasNoLyrics = !displayLyrics;
    const [shouldFadeOut, setShouldFadeOut] = useState(false);

    useEffect(() => {
        if (!fadeOutNoLyricsMessage) {
            setShouldFadeOut(false);
            return undefined;
        }

        if (!isLoadingLyrics && hasNoLyrics) {
            const timer = setTimeout(() => {
                setShouldFadeOut(true);
            }, 3000);
            return () => clearTimeout(timer);
        }

        if (!hasNoLyrics) {
            setShouldFadeOut(false);
        }

        return undefined;
    }, [isLoadingLyrics, hasNoLyrics, fadeOutNoLyricsMessage]);

    const handleExportLyrics = useCallback(() => {
        if (lyrics && !isLyricsDisabled) {
            openLyricsExportModal({ lyrics, offsetMs: currentOffsetMs, synced });
        }
    }, [currentOffsetMs, isLyricsDisabled, lyrics, synced]);

    const handleOpenSettings = () => {
        openLyricsSettingsModal(settingsKey);
    };

    return (
        <ComponentErrorBoundary>
            <div className={styles.lyricsContainer}>
                {wordTarget && (
                    <WordInfoPopover
                        key={`${wordTarget.lineIndex}-${wordTarget.charOffset}`}
                        onClose={handleCloseWordInfo}
                        target={wordTarget}
                    />
                )}
                {pickerTarget && (
                    <KanjiPicker
                        addingTimings={saveLyricsOverride.isPending}
                        canAddTimings={canAddTimings}
                        key={`${pickerTarget.lineIndex}-${pickerTarget.charOffset}-${pickerTarget.spanLength}`}
                        lyricsAreTimed={lyricsAreTimed}
                        onAddTimings={handleAddTimings}
                        onApplyToIdentical={handleApplyFuriganaToIdentical}
                        onBind={handleBindFurigana}
                        onClose={handleClosePicker}
                        onSaveMusicCard={handleSaveMusicCard}
                        onToggleDisplay={handleToggleFuriganaDisplay}
                        onUnbind={handleUnbindFurigana}
                        savingMusicCard={saveMusicCard.isPending}
                        target={pickerTarget}
                    />
                )}
                <ActionIcon
                    className={styles.settingsIcon}
                    icon="settings2"
                    iconProps={{ size: 'lg' }}
                    onClick={handleOpenSettings}
                    pos="absolute"
                    right={0}
                    top={0}
                    variant="subtle"
                />
                {currentSong && (
                    <ActionIcon
                        aria-label={t('page.musicCards.cardsFromSong')}
                        icon="library"
                        onClick={() =>
                            navigate(
                                `${AppRoute.MUSIC_CARDS}?mediaFileId=${encodeURIComponent(currentSong.id)}`,
                            )
                        }
                        pos="absolute"
                        right={40}
                        tooltip={{ label: t('page.musicCards.cardsFromSong') }}
                        top={0}
                        variant="subtle"
                    />
                )}
                {isLoadingLyrics ? (
                    <Spinner container />
                ) : (
                    <AnimatePresence mode="sync">
                        {hasNoLyrics ? (
                            <Center flex={1} w="100%">
                                <motion.div
                                    animate={{ opacity: shouldFadeOut ? 0 : 1 }}
                                    initial={{ opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <Group>
                                        <Text fw={500} isMuted isNoSelect>
                                            {t('page.fullscreenPlayer.noLyrics')}
                                        </Text>
                                    </Group>
                                </motion.div>
                            </Center>
                        ) : (
                            <motion.div
                                animate={{ opacity: 1 }}
                                className={styles.scrollContainer}
                                initial={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                {synced && syncedLyricsProps ? (
                                    isKaraoke ? (
                                        <SynchronizedKaraokeLyrics
                                            {...syncedLyricsProps}
                                            agents={selectedAgents}
                                        />
                                    ) : (
                                        <SynchronizedLyrics {...syncedLyricsProps} />
                                    )
                                ) : (
                                    <UnsynchronizedLyrics
                                        {...(displayLyrics as UnsynchronizedLyricsProps)}
                                        // Same gate as the synced branch: only
                                        // installed where it can act (Navidrome
                                        // binding API), so an unhandled kanji
                                        // click still falls through to the word
                                        // span's JMdict lookup
                                        onKanjiClick={
                                            enableFurigana && isNavidromeServer
                                                ? handleKanjiClick
                                                : undefined
                                        }
                                        onWordClick={enableWordLookup ? handleWordClick : undefined}
                                        romajiLyrics={
                                            enableRomaji
                                                ? (romajiConvertedLyrics as UnsynchronizedLyricsProps['romajiLyrics'])
                                                : null
                                        }
                                        settingsKey={settingsKey}
                                        translatedLyrics={showTranslation ? translatedLyrics : null}
                                    />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
                <div className={styles.actionsContainer}>
                    <LyricsActions
                        hasLyrics={!!displayLyrics}
                        index={indexToUse}
                        languages={languages}
                        offsetMs={displayOffsetMs}
                        onExportLyrics={handleExportLyrics}
                        onRemoveLyric={handleOnRemoveLyric}
                        onSearchOverride={handleOnSearchOverride}
                        onToggleOverlayLayer={handleToggleOverlayLayer}
                        onTranslateLyric={
                            translationApiProvider && translationApiKey
                                ? handleOnTranslateLyric
                                : undefined
                        }
                        onUpdateOffset={handleUpdateOffset}
                        overlayLayers={overlayLayerToggles}
                        setIndex={setIndex}
                        settingsKey={settingsKey}
                        visibleOverlayKeys={visibleOverlayKeys}
                    />
                </div>
            </div>
        </ComponentErrorBoundary>
    );
};
