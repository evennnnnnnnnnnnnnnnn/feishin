import clsx from 'clsx';
import isElectron from 'is-electron';
import { useCallback, useEffect, useRef } from 'react';

import styles from './synchronized-lyrics.module.css';

import { LyricLine } from '/@/renderer/features/lyrics/lyric-line';
import {
    subscribePlayerStatus,
    useLyricsDisplaySettings,
    useLyricsSettings,
    usePlaybackType,
    usePlayerActions,
    usePlayerStoreBase,
} from '/@/renderer/store';
import { subscribePlayerProgress, useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { FullLyricsMetadata, SynchronizedLyricsArray } from '/@/shared/types/domain-types';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const utils = isElectron() ? window.api.utils : null;
const mpris = isElectron() && utils?.isLinux() ? window.api.mpris : null;

export interface SynchronizedLyricsProps extends Omit<FullLyricsMetadata, 'lyrics'> {
    lyrics: SynchronizedLyricsArray;
    offsetMs?: number;
    romajiLyrics?: null | SynchronizedLyricsArray;
    settingsKey?: string;
    style?: React.CSSProperties;
    translatedLyrics?: null | string;
}

export const SynchronizedLyrics = ({
    artist,
    lyrics,
    name,
    offsetMs,
    remote,
    romajiLyrics,
    settingsKey = 'default',
    source,
    style,
    translatedLyrics,
}: SynchronizedLyricsProps) => {
    const playbackType = usePlaybackType();
    const lyricsSettings = useLyricsSettings();
    const displaySettings = useLyricsDisplaySettings(settingsKey);
    const settings = {
        ...lyricsSettings,
        fontSize:
            displaySettings.fontSize && displaySettings.fontSize !== 0
                ? displaySettings.fontSize
                : 24,
        gap: displaySettings.gap && displaySettings.gap !== 0 ? displaySettings.gap : 24,
        opacityNonActive: displaySettings.opacityNonActive,
        scaleNonActive:
            displaySettings.scaleNonActive && displaySettings.scaleNonActive !== 0
                ? displaySettings.scaleNonActive
                : 0.95,
    };
    const { mediaSeekToTimestamp } = usePlayerActions();

    const effectiveOffsetMs = offsetMs ?? 0;

    const handleSeek = useCallback(
        (time: number) => {
            if (playbackType === PlayerType.LOCAL && mpvPlayer) {
                mpvPlayer.seekTo(time);
            } else {
                mpris?.updateSeek(time);
                mediaSeekToTimestamp(time);
            }
        },
        [mediaSeekToTimestamp, playbackType],
    );

    const handleContainerClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const target = (event.target as HTMLElement).closest('[data-lyric-time]');
            if (!target) {
                return;
            }

            const time = Number((target as HTMLElement).dataset.lyricTime);
            if (time > 0 && Number.isFinite(time)) {
                handleSeek(time / 1000);
            }
        },
        [handleSeek],
    );

    // A reference to the timeout handler
    const lyricTimer = useRef<null | ReturnType<typeof setTimeout>>(null);

    // A reference to the lyrics. This is necessary for the
    // timers, which are not part of react necessarily, to always
    // have the most updated values
    const lyricRef = useRef<null | SynchronizedLyricsArray>(null);

    // A constantly increasing value, used to tell timers that may be out of date
    // whether to proceed or stop
    const timerEpoch = useRef(0);

    const delayMsRef = useRef(effectiveOffsetMs);
    const followRef = useRef(settings.follow);
    const statusRef = useRef(usePlayerStoreBase.getState().player.status);
    const userScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const programmaticScrollRef = useRef(false);
    const programmaticScrollTimeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);

    const getCurrentLyric = (timeInMs: number) => {
        const activeLyrics = lyricRef.current;
        if (!activeLyrics?.length) {
            return -1;
        }

        let index = -1;
        for (let idx = 0; idx < activeLyrics.length; idx += 1) {
            if (timeInMs < activeLyrics[idx][0]) {
                break;
            }
            index = idx;
        }

        return index;
    };

    const setCurrentLyricRef = useRef<
        (timeInMs: number, epoch?: number, targetIndex?: number) => void
    >(() => {});

    const setCurrentLyric = useCallback(
        (timeInMs: number, epoch?: number, targetIndex?: number) => {
            const start = performance.now();
            let nextEpoch: number;

            if (epoch === undefined) {
                timerEpoch.current = (timerEpoch.current + 1) % 10000;
                nextEpoch = timerEpoch.current;
            } else if (epoch !== timerEpoch.current) {
                return;
            } else {
                nextEpoch = epoch;
            }

            let index: number;

            if (targetIndex === undefined) {
                index = getCurrentLyric(timeInMs);
            } else {
                index = targetIndex;
            }

            // Directly modify the dom instead of using react to prevent rerender
            document
                .querySelectorAll('.synchronized-lyrics .active')
                .forEach((node) => node.classList.remove('active'));

            if (index === -1) {
                const activeLyrics = lyricRef.current;
                if (!activeLyrics?.length) {
                    return;
                }

                const firstTime = activeLyrics[0][0];
                if (timeInMs < firstTime) {
                    const elapsed = performance.now() - start;
                    const delay = Math.max(0, firstTime - timeInMs - elapsed);
                    lyricTimer.current = setTimeout(() => {
                        setCurrentLyricRef.current(firstTime, nextEpoch, 0);
                    }, delay);
                }

                return;
            }

            const doc = document.getElementById(
                'sychronized-lyrics-scroll-container',
            ) as HTMLElement;
            const currentLyric = document.querySelector(`#lyric-${index}`) as HTMLElement;

            const offsetTop = currentLyric?.offsetTop - doc?.clientHeight / 2 || 0;

            if (currentLyric === null) {
                return;
            }

            currentLyric.classList.add('active');

            if (followRef.current && !userScrollingRef.current) {
                programmaticScrollRef.current = true;
                doc?.scroll({ behavior: 'smooth', top: offsetTop });
            }

            if (index !== lyricRef.current!.length - 1) {
                const nextTime = lyricRef.current![index + 1][0];

                const elapsed = performance.now() - start;

                lyricTimer.current = setTimeout(
                    () => {
                        setCurrentLyricRef.current(nextTime, nextEpoch, index + 1);
                    },
                    nextTime - timeInMs - elapsed,
                );
            }
        },
        [],
    );

    const syncFromCurrentTimestamp = useCallback(() => {
        const timestamp = useTimestampStoreBase.getState().timestamp;
        setCurrentLyric(timestamp * 1000 + delayMsRef.current);
    }, [setCurrentLyric]);

    // Store the callback in a ref so it can be called recursively
    useEffect(() => {
        setCurrentLyricRef.current = setCurrentLyric;
    }, [setCurrentLyric]);

    useEffect(() => {
        // Copy the follow settings into a ref that can be accessed in the timeout
        followRef.current = settings.follow;
    }, [settings.follow]);

    useEffect(() => {
        lyricRef.current = lyrics;

        if (statusRef.current === PlayerStatus.PLAYING) {
            syncFromCurrentTimestamp();
        }

        return () => {
            if (lyricTimer.current) {
                clearTimeout(lyricTimer.current);
            }
        };
    }, [lyrics, syncFromCurrentTimestamp]);

    useEffect(() => {
        const newOffset = offsetMs ?? 0;
        if (delayMsRef.current === newOffset) {
            return;
        }

        if (lyricTimer.current) {
            clearTimeout(lyricTimer.current);
        }

        delayMsRef.current = newOffset;
        syncFromCurrentTimestamp();
    }, [offsetMs, syncFromCurrentTimestamp]);

    useEffect(() => {
        const unsubscribe = subscribePlayerProgress(({ timestamp }) => {
            if (statusRef.current !== PlayerStatus.PLAYING) {
                return;
            }

            if (lyricTimer.current) {
                clearTimeout(lyricTimer.current);
            }

            setCurrentLyric(timestamp * 1000 + delayMsRef.current);
        });

        return unsubscribe;
    }, [setCurrentLyric]);

    useEffect(() => {
        statusRef.current = usePlayerStoreBase.getState().player.status;

        const unsubscribe = subscribePlayerStatus(({ status }) => {
            statusRef.current = status;

            if (status !== PlayerStatus.PLAYING) {
                if (lyricTimer.current) {
                    clearTimeout(lyricTimer.current);
                }

                return;
            }

            if (lyricTimer.current) {
                clearTimeout(lyricTimer.current);
            }

            syncFromCurrentTimestamp();
        });

        return unsubscribe;
    }, [syncFromCurrentTimestamp]);

    useEffect(() => {
        // Guaranteed cleanup; stop the timer, and just in case also increment
        // the epoch to instruct any dangling timers to stop
        if (lyricTimer.current) {
            clearTimeout(lyricTimer.current);
        }

        timerEpoch.current += 1;
    }, []);

    // Handle manual scrolling - pause auto-scroll when user scrolls
    useEffect(() => {
        const container =
            containerRef.current ||
            (document.getElementById('sychronized-lyrics-scroll-container') as HTMLElement);
        if (!container) return;

        const handleScroll = () => {
            // Ignore programmatic scrolls (auto-scroll)
            if (programmaticScrollRef.current) {
                if (programmaticScrollTimeoutRef.current) {
                    clearTimeout(programmaticScrollTimeoutRef.current);
                }

                programmaticScrollTimeoutRef.current = setTimeout(() => {
                    programmaticScrollRef.current = false;
                }, 150);

                return;
            }

            userScrollingRef.current = true;

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Re-enable auto-scroll after 3 seconds of no scrolling
            scrollTimeoutRef.current = setTimeout(() => {
                userScrollingRef.current = false;
            }, 3000);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            if (programmaticScrollTimeoutRef.current) {
                clearTimeout(programmaticScrollTimeoutRef.current);
            }
        };
    }, []);

    const hideScrollbar = () => {
        const doc = document.getElementById('sychronized-lyrics-scroll-container') as HTMLElement;
        doc.classList.add('hide-scrollbar');
    };

    const showScrollbar = () => {
        const doc = document.getElementById('sychronized-lyrics-scroll-container') as HTMLElement;
        doc.classList.remove('hide-scrollbar');
    };

    return (
        <div
            className={clsx(styles.container, 'synchronized-lyrics overlay-scrollbar')}
            id="sychronized-lyrics-scroll-container"
            onClick={handleContainerClick}
            onMouseEnter={showScrollbar}
            onMouseLeave={hideScrollbar}
            ref={containerRef}
            style={
                {
                    // opacity/scale is set here for every lyric,
                    // and then overwritten by CSS for active lyrics
                    // to prevent expensive rerenders each lyric
                    '--lyric-opacity': settings.opacityNonActive,
                    '--lyric-scale': settings.scaleNonActive,
                    '--lyric-scale-origin': settings.alignment,
                    gap: `${settings.gap}px`,
                    ...style,
                } as React.CSSProperties
            }
        >
            {settings.showProvider && source && (
                <LyricLine
                    alignment={settings.alignment}
                    className="lyric-credit"
                    fontSize={settings.fontSize}
                    text={`Provided by ${source}`}
                />
            )}
            {settings.showMatch && remote && (
                <LyricLine
                    alignment={settings.alignment}
                    className="lyric-credit"
                    fontSize={settings.fontSize}
                    text={`"${name} by ${artist}"`}
                />
            )}
            {lyrics.map(([time, text], idx) => (
                <LyricLine
                    alignment={settings.alignment}
                    className="lyric-line synchronized"
                    data-lyric-time={time}
                    fontSize={settings.fontSize}
                    id={`lyric-${idx}`}
                    key={idx}
                    romajiText={romajiLyrics?.[idx]?.[1]}
                    text={text}
                    translatedText={translatedLyrics?.split('\n')[idx]}
                />
            ))}
        </div>
    );
};
