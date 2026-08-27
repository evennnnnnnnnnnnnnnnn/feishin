import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import styles from './synchronized-lyrics.module.css';

import '/@/renderer/features/lyrics/styles/synchronized-lyrics-animation.css';
import {
    buildLyricsOverridePayload,
    useSaveLyricsOverrideMutation,
} from '/@/renderer/features/lyrics/api/lyrics-override-api';
import {
    findOverlayLineByTime,
    getLyricLineStartMs,
    getLyricLineText,
    normalizeLyrics,
} from '/@/renderer/features/lyrics/api/lyrics-utils';
import { EditableLyricLine } from '/@/renderer/features/lyrics/components/editable-lyric-line';
import { LyricsScrollContent } from '/@/renderer/features/lyrics/components/lyrics-scroll-content';
import { useLyricsAnimationEngine } from '/@/renderer/features/lyrics/hooks/use-lyrics-animation-engine';
import {
    LYRICS_SCROLL_CONTAINER_ID,
    useSynchronizedLyricsBase,
} from '/@/renderer/features/lyrics/hooks/use-synchronized-lyrics-base';
import { KanjiSpanClickDetail, LyricLine } from '/@/renderer/features/lyrics/lyric-line';
import {
    subscribePlayerStatus,
    useCurrentServer,
    useIsAdmin,
    usePlayerActions,
    usePlayerSong,
    usePlayerStoreBase,
} from '/@/renderer/store';
import { subscribePlayerProgress, useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import {
    FullLyricsMetadata,
    ServerType,
    SynchronizedLyrics as SynchronizedLyricsData,
} from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';

const PREVIEW_DURATION_MS = 1000;

export interface SynchronizedLyricsProps extends Omit<FullLyricsMetadata, 'lyrics'> {
    extraOverlayLyrics?: SynchronizedLyricsData[];
    lyrics: SynchronizedLyricsData;
    offsetMs?: number;
    onKanjiClick?: (detail: KanjiSpanClickDetail) => void;
    preview?: boolean;
    pronunciationLyrics?: null | SynchronizedLyricsData;
    /** Pre-furigana/romaji-transform lines, used as the edit/save source of
     * truth so an admin edit never persists rendered furigana markup as the
     * canonical lyric text. Defaults to `lyrics` when not provided. */
    rawLyrics?: SynchronizedLyricsData;
    romajiLyrics?: null | SynchronizedLyricsData;
    settingsKey?: string;
    style?: React.CSSProperties;
    translatedLyrics?: null | string;
    translationLyrics?: null | SynchronizedLyricsData;
}

const SEEK_DETECT_THRESHOLD_MS = 500;
const PREVIEW_FONT_SIZE = 20;
const PREVIEW_GAP = 20;

export const SynchronizedLyrics = ({
    artist,
    lyrics,
    name,
    offsetMs,
    onKanjiClick,
    preview = false,
    pronunciationLyrics,
    rawLyrics,
    romajiLyrics,
    settingsKey = 'default',
    source,
    style,
    translatedLyrics,
    translationLyrics,
}: SynchronizedLyricsProps) => {
    const {
        containerRef,
        containerStyle,
        delayMsRef,
        followRef,
        followScrollAlignmentRef,
        handleLineClick,
        handleSeek,
        hideScrollbar,
        lineLeadTimeMsRef,
        lyricRef,
        resumeAutoscroll,
        scrollAnimStateRef,
        settings,
        showScrollbar,
        userScrollingRef,
    } = useSynchronizedLyricsBase(settingsKey, offsetMs);

    const { isAdmin } = useIsAdmin();
    const currentServerType = useCurrentServer()?.type;
    const currentSong = usePlayerSong();
    const { mediaPause, mediaPlay } = usePlayerActions();
    const saveLyricsOverride = useSaveLyricsOverrideMutation();
    const canEditLyrics = !preview && isAdmin && currentServerType === ServerType.NAVIDROME;

    const [editingLine, setEditingLine] = useState<null | {
        field: 'text' | 'time';
        index: number;
    }>(null);
    const previewRestoreRef = useRef<null | {
        timeoutId: ReturnType<typeof setTimeout>;
        wasPaused: boolean;
    }>(null);

    useEffect(() => {
        if (editingLine) {
            userScrollingRef.current = true;
        } else {
            resumeAutoscroll();
        }
    }, [editingLine, resumeAutoscroll, userScrollingRef]);

    useEffect(() => {
        return () => {
            if (previewRestoreRef.current) {
                clearTimeout(previewRestoreRef.current.timeoutId);
            }
        };
    }, []);

    const handlePreview = useCallback(
        (previewMs: number) => {
            if (previewRestoreRef.current) {
                clearTimeout(previewRestoreRef.current.timeoutId);
                previewRestoreRef.current = null;
            }

            const wasPaused = usePlayerStoreBase.getState().player.status !== PlayerStatus.PLAYING;
            const previousTimestamp = useTimestampStoreBase.getState().timestamp;

            handleSeek(previewMs / 1000);
            if (wasPaused) {
                mediaPlay();
            }

            previewRestoreRef.current = {
                timeoutId: setTimeout(() => {
                    if (wasPaused) {
                        mediaPause();
                        handleSeek(previousTimestamp);
                    }
                    previewRestoreRef.current = null;
                }, PREVIEW_DURATION_MS),
                wasPaused,
            };
        },
        [handleSeek, mediaPause, mediaPlay],
    );

    const handleCommitLine = useCallback(
        (index: number, updates: { startMs?: number; text?: string }) => {
            setEditingLine(null);

            if (!currentSong?._serverId || !currentSong?.id) {
                return;
            }

            const baseLines = normalizeLyrics(rawLyrics ?? lyrics);
            const nextLines = baseLines.map((line, i) =>
                i === index
                    ? {
                          ...line,
                          startMs: updates.startMs ?? line.startMs,
                          text: updates.text ?? line.text,
                      }
                    : line,
            );

            saveLyricsOverride.mutate({
                payload: buildLyricsOverridePayload({ artist, name }, nextLines),
                serverId: currentSong._serverId,
                songId: currentSong.id,
            });
        },
        [artist, currentSong, lyrics, name, rawLyrics, saveLyricsOverride],
    );

    const handleSetCurrentTime = useCallback(
        (index: number) => {
            const currentMs = Math.round(useTimestampStoreBase.getState().timestamp * 1000);
            handleCommitLine(index, { startMs: currentMs });
        },
        [handleCommitLine],
    );

    const effectiveFontSize = preview ? PREVIEW_FONT_SIZE : settings.fontSize;
    const effectiveGap = preview ? PREVIEW_GAP : settings.gap;
    const effectivePaddingLeft = preview ? 0 : settings.paddingLeft;
    const effectivePaddingRight = preview ? 0 : settings.paddingRight;

    const normalizedLyrics = useMemo(() => normalizeLyrics(lyrics), [lyrics]);
    // Raw (pre-furigana/romaji-transform) lines, indexed in parallel with
    // normalizedLyrics, so the text editor seeds from the untransformed
    // source instead of rendered <ruby>/romaji markup.
    const normalizedRawLyrics = useMemo(
        () => (rawLyrics ? normalizeLyrics(rawLyrics) : null),
        [rawLyrics],
    );
    const rafRef = useRef<null | number>(null);
    const statusRef = useRef(usePlayerStoreBase.getState().player.status);
    const lastSyncedTimeRef = useRef(0);

    const {
        rebuildLyricsData,
        reset,
        resumeAutoscroll: resumeEngineAutoscroll,
        tick,
    } = useLyricsAnimationEngine({
        animStateRef: scrollAnimStateRef,
        containerRef,
        followRef,
        followScrollAlignmentRef,
        fontSize: effectiveFontSize,
        gap: effectiveGap,
        lineIdPrefix: 'lyric',
        lineLeadTimeMsRef,
        lyrics: normalizedLyrics,
        paddingLeft: effectivePaddingLeft,
        paddingRight: effectivePaddingRight,
        scrollContainerId: LYRICS_SCROLL_CONTAINER_ID,
    });

    const syncAtTime = useCallback(
        (timeInMs: number, isPlaying: boolean, forceReset = false) => {
            if (forceReset) {
                reset();
                rebuildLyricsData();
            }

            tick(timeInMs, isPlaying);
            lastSyncedTimeRef.current = timeInMs;
        },
        [rebuildLyricsData, reset, tick],
    );

    const stopRaf = useCallback(() => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const startRaf = useCallback(() => {
        stopRaf();

        const runTick = () => {
            if (statusRef.current !== PlayerStatus.PLAYING) {
                stopRaf();
                return;
            }

            const timestamp = useTimestampStoreBase.getState().timestamp;
            const timeInMs = timestamp * 1000 + delayMsRef.current;

            if (Math.abs(timeInMs - lastSyncedTimeRef.current) > SEEK_DETECT_THRESHOLD_MS) {
                resumeAutoscroll();
                resumeEngineAutoscroll();
                syncAtTime(timeInMs, true, true);
            } else {
                syncAtTime(timeInMs, true);
            }

            rafRef.current = requestAnimationFrame(runTick);
        };

        rafRef.current = requestAnimationFrame(runTick);
    }, [delayMsRef, resumeAutoscroll, resumeEngineAutoscroll, stopRaf, syncAtTime]);

    const syncFromCurrentTimestamp = useCallback(() => {
        const timestamp = useTimestampStoreBase.getState().timestamp;
        const isPlaying = statusRef.current === PlayerStatus.PLAYING;
        syncAtTime(timestamp * 1000 + delayMsRef.current, isPlaying, true);
    }, [delayMsRef, syncAtTime]);

    useEffect(() => {
        lyricRef.current = normalizedLyrics;
        lastSyncedTimeRef.current = 0;

        const frame = requestAnimationFrame(() => {
            rebuildLyricsData();

            if (statusRef.current === PlayerStatus.PLAYING) {
                startRaf();
            } else {
                syncFromCurrentTimestamp();
            }
        });

        return () => {
            cancelAnimationFrame(frame);
            stopRaf();
            reset();
        };
    }, [
        lyricRef,
        normalizedLyrics,
        rebuildLyricsData,
        reset,
        startRaf,
        stopRaf,
        syncFromCurrentTimestamp,
    ]);

    useEffect(() => {
        syncFromCurrentTimestamp();
    }, [offsetMs, syncFromCurrentTimestamp]);

    useEffect(() => {
        statusRef.current = usePlayerStoreBase.getState().player.status;

        const unsubscribe = subscribePlayerStatus(({ status }) => {
            statusRef.current = status;

            if (status !== PlayerStatus.PLAYING) {
                stopRaf();
                syncFromCurrentTimestamp();
                return;
            }

            startRaf();
        });

        return unsubscribe;
    }, [startRaf, stopRaf, syncFromCurrentTimestamp]);

    useEffect(() => {
        const unsubscribe = subscribePlayerProgress(({ timestamp }) => {
            const timeInMs = timestamp * 1000 + delayMsRef.current;
            const isPlaying = statusRef.current === PlayerStatus.PLAYING;

            if (!isPlaying) {
                syncAtTime(timeInMs, false, true);
                return;
            }

            if (Math.abs(timeInMs - lastSyncedTimeRef.current) > SEEK_DETECT_THRESHOLD_MS) {
                resumeAutoscroll();
                resumeEngineAutoscroll();
                syncAtTime(timeInMs, true, true);
            }
        });

        return unsubscribe;
    }, [delayMsRef, resumeAutoscroll, resumeEngineAutoscroll, syncAtTime]);

    const handleContainerClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            resumeAutoscroll();
            resumeEngineAutoscroll();
            handleLineClick(event);
        },
        [handleLineClick, resumeAutoscroll, resumeEngineAutoscroll],
    );

    const getOverlayText = (
        overlayLyrics: null | SynchronizedLyricsData | undefined,
        startMs: number,
        lineIndex: number,
        fallback?: null | string,
    ) => {
        if (overlayLyrics) {
            return findOverlayLineByTime(overlayLyrics, startMs, lineIndex);
        }

        return fallback;
    };

    return (
        <div
            className={clsx(
                styles.container,
                preview && styles.preview,
                'synchronized-lyrics overlay-scrollbar',
            )}
            id={LYRICS_SCROLL_CONTAINER_ID}
            onClick={handleContainerClick}
            onMouseEnter={showScrollbar}
            onMouseLeave={hideScrollbar}
            ref={containerRef}
            style={{ ...containerStyle, ...style }}
        >
            <LyricsScrollContent
                gap={effectiveGap}
                paddingLeft={effectivePaddingLeft}
                paddingRight={effectivePaddingRight}
                preview={preview}
            >
                {settings.showProvider && source && (
                    <LyricLine
                        alignment={settings.alignment}
                        fontSize={effectiveFontSize}
                        text={`${source}`}
                    />
                )}
                {settings.showMatch && (
                    <LyricLine
                        alignment={settings.alignment}
                        fontSize={effectiveFontSize}
                        text={`${name} — ${artist}`}
                    />
                )}
                {normalizedLyrics.map((rawLine, idx) => {
                    const lineStartMs = getLyricLineStartMs(rawLine);
                    const lineText = getLyricLineText(rawLine);
                    const rawLineText = normalizedRawLyrics?.[idx]
                        ? getLyricLineText(normalizedRawLyrics[idx])
                        : lineText;
                    const pronunciationText = getOverlayText(
                        pronunciationLyrics,
                        lineStartMs,
                        idx,
                        romajiLyrics?.[idx] ? getLyricLineText(romajiLyrics[idx]) : undefined,
                    );
                    const translationText = getOverlayText(
                        translationLyrics,
                        lineStartMs,
                        idx,
                        translatedLyrics?.split('\n')[idx],
                    );

                    if (canEditLyrics) {
                        return (
                            <EditableLyricLine
                                alignment={settings.alignment}
                                editing={editingLine?.index === idx ? editingLine.field : null}
                                fontSize={effectiveFontSize}
                                key={idx}
                                lineId={`lyric-${idx}`}
                                lineIndex={idx}
                                onCancelEdit={() => setEditingLine(null)}
                                onCommitText={(text) => handleCommitLine(idx, { text })}
                                onCommitTime={(ms) => handleCommitLine(idx, { startMs: ms })}
                                onKanjiClick={onKanjiClick}
                                onPreview={handlePreview}
                                onSetCurrentTime={() => handleSetCurrentTime(idx)}
                                onStartEdit={(field) => setEditingLine({ field, index: idx })}
                                rawText={rawLineText}
                                romajiText={pronunciationText}
                                startMs={lineStartMs}
                                text={lineText}
                                translatedText={translationText}
                            />
                        );
                    }

                    return (
                        <LyricLine
                            alignment={settings.alignment}
                            className="lyric-line synchronized"
                            data-lyric-time={lineStartMs}
                            fontSize={effectiveFontSize}
                            id={`lyric-${idx}`}
                            key={idx}
                            lineIndex={idx}
                            onKanjiClick={onKanjiClick}
                            romajiText={pronunciationText}
                            text={lineText}
                            translatedText={translationText}
                        />
                    );
                })}
            </LyricsScrollContent>
        </div>
    );
};
